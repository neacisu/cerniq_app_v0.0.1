import { describe, expect, it, vi, beforeEach } from "vitest";
import { createReadStream, mkdtempSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import Papa from "papaparse";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { JobLogger } from "@cerniq/observability";
import type {
  BronzeCsvParserDeps,
  CsvParserJobHandle,
} from "./bronze-ingest-csv-parser-handler.js";
import {
  detectFileEncoding,
  executeCsvParserJob,
  parseLargeFileStreaming,
  parseSmallFile,
} from "./bronze-ingest-csv-parser-handler.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const batchId = "44444444-4444-4444-8444-444444444444";

function baseJob(over: Partial<CsvParserJobHandle["data"]> = {}): CsvParserJobHandle {
  return {
    id: "job-1",
    name: "ingest:csv",
    data: {
      tenantId,
      batchId,
      filePath: "/tmp/x.csv",
      fileName: "x.csv",
      fileSize: 10,
      correlationId: "corr-1",
      hasHeader: true,
      ...over,
    },
  };
}

/** Pentru ramuri `batchId` falsy în condiții de guard (păstrăm tipul câmpului ca string gol). */
function jobNoBatch(over: Partial<CsvParserJobHandle["data"]> = {}): CsvParserJobHandle {
  const j = baseJob(over);
  return { ...j, data: { ...j.data, batchId: "" } };
}

function mockLogger(): JobLogger {
  return {
    step: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as JobLogger;
}

function baseDeps(over: Partial<BronzeCsvParserDeps> = {}): BronzeCsvParserDeps {
  const insertResult = {
    rowsInserted: 1,
    errorRows: 0,
    duplicateRows: 0,
    resolvedRows: 1,
    identityConflictRows: 0,
    insufficientIdentifierRows: 0,
    processableIds: ["b1"],
  };
  return {
    getBatchFileHash: vi.fn(async () => undefined),
    verifyFileHash: vi.fn(async () => ({ valid: true })),
    readInputContent: vi.fn(async () => "a,b\n1,2"),
    createFileReadStream: vi.fn((fp: string, enc: string) =>
      createReadStream(fp, { encoding: enc as NodeJS.BufferEncoding }),
    ),
    detectEncoding: vi.fn(() => "utf8"),
    detectColumnMapping: vi.fn(() => ({ a: "a", b: "b" })),
    getInsertBatchSize: vi.fn(() => 2),
    shouldUseStreaming: vi.fn(async () => false),
    insertBronzeRows: vi.fn(async () => insertResult),
    updateImportBatchCounters: vi.fn(async () => undefined),
    markImportBatchFailed: vi.fn(async () => undefined),
    triggerNormalizationForContacts: vi.fn(async () => undefined),
    triggerAnafBronzeEnrichment: vi.fn(async () => undefined),
    persistBatchColumnMapping: vi.fn(async () => undefined),
    updateImportRuntimeProgress: vi.fn(async () => ({ paused: false })),
    createJobLogger: vi.fn(() => mockLogger()),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseSmallFile", () => {
  it("catch: propagă eroare non-Error și loghează fără stack", async () => {
    const log = mockLogger();
    const deps = baseDeps({
      createJobLogger: vi.fn(() => log),
      // Valoare non-Error: acoperă explicit ramura `error instanceof Error` din catch-ul `parseSmallFile`.
      readInputContent: vi.fn(() => Promise.reject(42)), // NOSONAR - reject non-Error intenționat
    });
    await expect(parseSmallFile(baseJob(), deps)).rejects.toBe(42);
    expect(log.error).toHaveBeenCalledWith(
      "fatal",
      expect.stringContaining("42"),
      expect.objectContaining({ errorStack: undefined }),
    );
  });

  it("folosește fallback fileName și jobId gol când lipsesc", async () => {
    const log = mockLogger();
    const deps = baseDeps({
      createJobLogger: vi.fn((opts) => {
        expect(opts.workerName).toBe("A1:csv-parser");
        expect(opts.jobId).toBe("");
        return log;
      }),
      readInputContent: vi.fn(async () => "a,b\n1,2"),
    });
    const j = baseJob({ fileName: undefined as unknown as string });
    Reflect.deleteProperty(j, "id");
    await parseSmallFile(j, deps);
    expect(log.step).toHaveBeenCalledWith(
      "start",
      expect.stringContaining("(necunoscut)"),
      expect.any(Object),
    );
  });

  it("eroare Papa: message non-string → detailRaw gol", async () => {
    const parseMock = vi.spyOn(Papa, "parse").mockReturnValue({
      errors: [{ code: "X", message: 42 as unknown as string, row: 0 }],
      data: [],
      meta: { fields: [] },
    } as never);
    try {
      const deps = baseDeps({ readInputContent: vi.fn(async () => "x") });
      await expect(parseSmallFile(baseJob(), deps)).rejects.toThrow(/unknown error/i);
    } finally {
      parseMock.mockRestore();
    }
  });

  it("Papa parse folosește header implicit când hasHeader e undefined", async () => {
    const parseMock = vi.spyOn(Papa, "parse").mockImplementation((_content, opts) => {
      expect(opts?.header).toBe(true);
      return {
        errors: [],
        data: [{ a: "1" }],
        meta: { fields: ["a"] },
      } as never;
    });
    try {
      const deps = baseDeps({ readInputContent: vi.fn(async () => "a\n1") });
      await parseSmallFile(baseJob({ hasHeader: undefined }), deps);
    } finally {
      parseMock.mockRestore();
    }
  });

  it("raportează eroare Papa cu mesaj fallback în log și throw", async () => {
    const parseMock = vi.spyOn(Papa, "parse").mockReturnValue({
      errors: [{ code: "TooFewFields", message: "", row: 0 }],
      data: [],
      meta: { fields: [] },
    } as never);
    try {
      const log = mockLogger();
      const deps = baseDeps({
        createJobLogger: vi.fn(() => log),
        readInputContent: vi.fn(async () => "x"),
      });
      await expect(parseSmallFile(baseJob(), deps)).rejects.toThrow(/unknown error/i);
      expect(log.error).toHaveBeenCalledWith(
        "csv_parse",
        expect.stringContaining("eroare necunoscută"),
        expect.any(Object),
      );
    } finally {
      parseMock.mockRestore();
    }
  });

  it("parsează și inserează rânduri (flux nominal)", async () => {
    const deps = baseDeps({
      readInputContent: vi.fn(async () => "company,cui\nAcme,1"),
    });
    const job = baseJob();
    const r = await parseSmallFile(job, deps);
    expect(r.ok).toBe(true);
    expect(deps.insertBronzeRows).toHaveBeenCalled();
    expect(deps.triggerNormalizationForContacts).toHaveBeenCalledWith(
      tenantId,
      ["b1"],
      "corr-1",
      batchId,
      null,
    );
    expect(deps.triggerAnafBronzeEnrichment).toHaveBeenCalledWith(
      tenantId,
      batchId,
      ["b1"],
      "corr-1",
      null,
    );
    expect(deps.persistBatchColumnMapping).toHaveBeenCalled();
  });

  it("loghează succes verificare hash când există hash stocat valid", async () => {
    const log = mockLogger();
    const deps = baseDeps({
      createJobLogger: vi.fn(() => log),
      getBatchFileHash: vi.fn(async () => "abc"),
      verifyFileHash: vi.fn(async () => ({ valid: true })),
      readInputContent: vi.fn(async () => "a,b\n1,2"),
    });
    await parseSmallFile(baseJob(), deps);
    expect(log.info).toHaveBeenCalledWith(
      "file_hash_check",
      "Integritate fișier verificată cu succes (SHA-256 OK)",
      expect.objectContaining({ filePath: "/tmp/x.csv" }),
    );
  });

  it("nu verifică hash dacă lipsește filePath", async () => {
    const deps = baseDeps();
    const job = baseJob({ filePath: "", batchId });
    await parseSmallFile(job, deps);
    expect(deps.getBatchFileHash).not.toHaveBeenCalled();
  });

  it("aruncă la hash invalid", async () => {
    const deps = baseDeps({
      getBatchFileHash: vi.fn(async () => "deadbeef"),
      verifyFileHash: vi.fn(async () => ({ valid: false })),
    });
    const job = baseJob();
    await expect(parseSmallFile(job, deps)).rejects.toThrow("File integrity check failed");
    expect(deps.markImportBatchFailed).toHaveBeenCalled();
  });

  it("raportează eroare Papa Parse", async () => {
    const deps = baseDeps({
      readInputContent: vi.fn(async () => '"unclosed'),
    });
    const job = baseJob();
    await expect(parseSmallFile(job, deps)).rejects.toThrow(/CSV parse failed/i);
  });

  it("emite warn la identityConflictRows > 0", async () => {
    const log = mockLogger();
    const deps = baseDeps({
      createJobLogger: vi.fn(() => log),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 0,
        identityConflictRows: 2,
        insufficientIdentifierRows: 0,
        processableIds: ["x"],
      })),
    });
    await parseSmallFile(baseJob(), deps);
    expect(log.warn).toHaveBeenCalled();
  });

  it("nu persistă mapare când batchId lipsește (string gol)", async () => {
    const deps = baseDeps({
      readInputContent: vi.fn(async () => "a,b\n1,2"),
    });
    await parseSmallFile(jobNoBatch(), deps);
    expect(deps.persistBatchColumnMapping).not.toHaveBeenCalled();
  });

  it("nu persistă mapare coloane dacă mapping gol", async () => {
    const deps = baseDeps({
      detectColumnMapping: vi.fn(() => ({})),
    });
    await parseSmallFile(baseJob(), deps);
    expect(deps.persistBatchColumnMapping).not.toHaveBeenCalled();
  });

  it("folosește processableIds gol când lipsește în rezultat", async () => {
    const deps = baseDeps({
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 0,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 0,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
      })),
    });
    await parseSmallFile(baseJob(), deps);
    expect(deps.triggerNormalizationForContacts).toHaveBeenCalledWith(
      tenantId,
      [],
      "corr-1",
      batchId,
      null,
    );
  });
});

describe("parseLargeFileStreaming", () => {
  it("streaming: delimiter custom și mapare din câmpuri fără columnMapping preset", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-auto-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "col1;col2\na;b\nc;d\n", "utf8");
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 10),
      detectColumnMapping: vi.fn((fields) => Object.fromEntries(fields.map((f: string) => [f, f]))),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
        processableIds: ["p"],
      })),
    });
    const job = baseJob({
      filePath: fp,
      encoding: "utf8",
      delimiter: ";",
      hasHeader: true,
    });
    await parseLargeFileStreaming(job, deps);
    expect(deps.detectColumnMapping).toHaveBeenCalled();
  });

  it("streaming: sare peste rând fără chei (obiect gol)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-empty-row-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "a,b\n1,2\n,\n3,4\n", "utf8");
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 10),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
        processableIds: [],
      })),
    });
    const job = baseJob({ filePath: fp, encoding: "utf8" });
    await parseLargeFileStreaming(job, deps);
    expect(deps.insertBronzeRows).toHaveBeenCalled();
  });

  it("concatenează processableIds undefined ca array gol în flush", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-neuron-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "h1,h2\nv1,v2\n", "utf8");
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 5),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
      })),
    });
    const job = baseJob({ filePath: fp, columnMapping: { h1: "h1", h2: "h2" } });
    await parseLargeFileStreaming(job, deps);
    expect(deps.triggerNormalizationForContacts).toHaveBeenCalledWith(
      tenantId,
      [],
      "corr-1",
      batchId,
      null,
    );
  });

  it("procesează fișier cu Papa streaming", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-neuron-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "h1,h2\nv1,v2\nv3,v4\n", "utf8");
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 1),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
        processableIds: ["p1"],
      })),
    });
    const job = baseJob({ filePath: fp, columnMapping: { h1: "h1", h2: "h2" } });
    const r = await parseLargeFileStreaming(job, deps);
    expect(r.rowsRead).toBeGreaterThanOrEqual(2);
    expect(deps.updateImportRuntimeProgress).toHaveBeenCalled();
  });

  it("Papa mock: guard reachedMax + rând fără chei", async () => {
    const parseMock = vi.spyOn(Papa, "parse").mockImplementation((_stream, opts) => {
      if (!opts) return undefined as never;
      const p = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
      const meta = { fields: ["a"] };
      opts.step?.({ data: null as never, meta } as never, p);
      opts.step?.({ data: {}, meta } as never, p);
      opts.step?.({ data: { a: "1" }, meta } as never, p);
      opts.step?.({ data: { a: "2" }, meta } as never, p);
      opts.step?.({ data: { a: "3" }, meta } as never, p);
      opts.complete?.({ data: [], errors: [], meta: meta as Papa.ParseMeta }, undefined as never);
      return undefined as never;
    });
    try {
      const dir = mkdtempSync(join(tmpdir(), "csv-mock-"));
      const fp = join(dir, "x.csv");
      writeFileSync(fp, "x", "utf8");
      const deps = baseDeps({
        getInsertBatchSize: vi.fn(() => 10),
        insertBronzeRows: vi.fn(async () => ({
          rowsInserted: 1,
          errorRows: 0,
          duplicateRows: 0,
          resolvedRows: 1,
          identityConflictRows: 0,
          insufficientIdentifierRows: 0,
          processableIds: [],
        })),
      });
      const job = baseJob({ filePath: fp, encoding: "utf8", maxRows: 1 });
      await parseLargeFileStreaming(job, deps);
      expect(deps.insertBronzeRows).toHaveBeenCalled();
    } finally {
      parseMock.mockRestore();
    }
  });

  it("respectă skipRows și maxRows", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-neuron-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "a,b\n1,1\n2,2\n3,3\n", "utf8");
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 10),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
        processableIds: [],
      })),
    });
    const job = baseJob({ filePath: fp, skipRows: 1, maxRows: 1 });
    await parseLargeFileStreaming(job, deps);
    expect(deps.insertBronzeRows).toHaveBeenCalledTimes(1);
  });

  it("oprește flush când runtime raportează paused", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-neuron-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "a,b\n1,1\n2,2\n", "utf8");
    let n = 0;
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 1),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
        processableIds: ["z"],
      })),
      updateImportRuntimeProgress: vi.fn(async () => {
        n++;
        return { paused: n === 1 };
      }),
    });
    const job = baseJob({ filePath: fp });
    const r = await parseLargeFileStreaming(job, deps);
    expect(r.ok).toBe(true);
  });

  it("propagă eroare din Papa parse (stream error callback)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-err-"));
    const fp = join(dir, "e.csv");
    writeFileSync(fp, "a,b\n1,1\n", "utf8");
    const errStream = new Readable({
      read() {
        queueMicrotask(() => this.emit("error", new Error("stream pap err")));
      },
    });
    const deps = baseDeps({
      createFileReadStream: vi.fn(() => errStream),
    });
    const job = baseJob({ filePath: fp, encoding: "utf8" });
    await expect(parseLargeFileStreaming(job, deps)).rejects.toThrow("stream pap err");
  });

  it("propagă eroare din flush și apelează recordParserWorkerError", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-neuron-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "a,b\n1,1\n2,2\n3,3\n", "utf8");
    const recordParserWorkerError = vi.fn();
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 1),
      insertBronzeRows: vi.fn(async () => {
        throw new Error("flush fail");
      }),
      recordParserWorkerError,
    });
    const job = baseJob({ filePath: fp });
    await expect(parseLargeFileStreaming(job, deps)).rejects.toThrow("flush fail");
    expect(recordParserWorkerError).toHaveBeenCalled();
  });

  it("abort parser când flushBuffer eșuează după pause", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-neuron-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "a,b\n1,1\n2,2\n", "utf8");
    let calls = 0;
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 1),
      insertBronzeRows: vi.fn(async () => {
        calls++;
        if (calls === 2) throw new Error("second batch");
        return {
          rowsInserted: 1,
          errorRows: 0,
          duplicateRows: 0,
          resolvedRows: 1,
          identityConflictRows: 0,
          insufficientIdentifierRows: 0,
          processableIds: ["a"],
        };
      }),
    });
    const job = baseJob({ filePath: fp });
    await expect(parseLargeFileStreaming(job, deps)).rejects.toThrow("second batch");
  });

  it("înveliș eroare non-Error la catch streaming", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-neuron-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "a,b\n1,1\n", "utf8");
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 1),
      // Valoare non-Error: acoperă ramura de învăluire din catch-ul streaming din `bronze-ingest-csv-parser-handler.ts`.
      insertBronzeRows: vi.fn(() => Promise.reject(42)), // NOSONAR - reject non-Error intenționat
    });
    const job = baseJob({ filePath: fp });
    await expect(parseLargeFileStreaming(job, deps)).rejects.toMatchObject({
      message: "42",
    });
  });
});

describe("detectFileEncoding", () => {
  it("respinge pentru fișier inexistent (eroare stream)", async () => {
    const missing = join(tmpdir(), `no-such-${Date.now()}.bin`);
    await expect(
      detectFileEncoding(missing, { detectEncoding: vi.fn(() => "utf8") }),
    ).rejects.toThrow();
  });

  it("citește eșantion și apelează detectEncoding", async () => {
    const dir = mkdtempSync(join(tmpdir(), "enc-"));
    const fp = join(dir, "b.bin");
    writeFileSync(fp, Buffer.from([0xef, 0xbb, 0xbf, 0x41]));
    const detectEncoding = vi.fn(() => "utf8");
    const enc = await detectFileEncoding(fp, { detectEncoding });
    expect(enc).toBe("utf8");
    expect(detectEncoding).toHaveBeenCalled();
  });
});

describe("executeCsvParserJob", () => {
  it("alege small vs streaming", async () => {
    const deps = baseDeps({
      shouldUseStreaming: vi.fn(async () => true),
      readInputContent: vi.fn(async () => "a\n1"),
      getInsertBatchSize: vi.fn(() => 5),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
        processableIds: [],
      })),
    });
    const dir = mkdtempSync(join(tmpdir(), "csv-exec-"));
    const fp = join(dir, "one.csv");
    writeFileSync(fp, "c\n1\n", "utf8");
    const job = baseJob({ filePath: fp, encoding: "utf8" });
    await executeCsvParserJob(job, deps);
    expect(deps.shouldUseStreaming).toHaveBeenCalled();
  });

  it("folosește parseSmallFile când streaming e dezactivat", async () => {
    const readInputContent = vi.fn(async () => "a,b\n1,2");
    const deps = baseDeps({
      shouldUseStreaming: vi.fn(async () => false),
      readInputContent,
    });
    await executeCsvParserJob(baseJob(), deps);
    expect(readInputContent).toHaveBeenCalled();
  });
});

describe("parseSmallFile — ramuri suplimentare", () => {
  it("respectă columnMapping preset, skipRows și maxRows", async () => {
    const deps = baseDeps({
      readInputContent: vi.fn(async () => "x,y,z\n1,1,1\n2,2,2\n3,3,3\n"),
      detectColumnMapping: vi.fn(() => ({ x: "x" })),
    });
    const job = baseJob({
      columnMapping: { x: "x", y: "y" },
      skipRows: 1,
      maxRows: 1,
      hasHeader: true,
    });
    const r = await parseSmallFile(job, deps);
    expect(r.rowsRead).toBe(1);
    expect(deps.insertBronzeRows).toHaveBeenCalledWith(
      tenantId,
      [{ x: "2", y: "2", z: "2" }],
      "csv_import",
      batchId,
      undefined,
      expect.objectContaining({
        startingRowNumber: 1,
        columnMapping: { x: "x", y: "y" },
      }),
    );
  });

  it("acceptă hasHeader false", async () => {
    const deps = baseDeps({
      readInputContent: vi.fn(async () => "1,2\n3,4\n"),
      detectColumnMapping: vi.fn(() => ({ field1: "a" })),
    });
    const job = baseJob({ hasHeader: false, delimiter: "," });
    await parseSmallFile(job, deps);
    expect(deps.insertBronzeRows).toHaveBeenCalled();
  });
});

describe("parseLargeFileStreaming — ramuri opționale job", () => {
  it("fallback fileName și jobId gol în log start streaming", async () => {
    const log = mockLogger();
    const parseMock = vi.spyOn(Papa, "parse").mockImplementation((_stream, opts) => {
      if (!opts) return undefined as never;
      opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined as never);
      return undefined as never;
    });
    try {
      const dir = mkdtempSync(join(tmpdir(), "csv-fn-"));
      const fp = join(dir, "t.csv");
      writeFileSync(fp, "x", "utf8");
      const deps = baseDeps({
        createJobLogger: vi.fn(() => log),
      });
      const j = baseJob({
        filePath: fp,
        encoding: "utf8",
        fileName: undefined as unknown as string,
      });
      Reflect.deleteProperty(j, "id");
      await parseLargeFileStreaming(j, deps);
      expect(log.step).toHaveBeenCalledWith(
        "start",
        expect.stringContaining("(necunoscut)"),
        expect.any(Object),
      );
    } finally {
      parseMock.mockRestore();
    }
  });

  it("hasHeader undefined cade pe true implicit", async () => {
    const parseMock = vi.spyOn(Papa, "parse").mockImplementation((_stream, opts) => {
      if (!opts) return undefined as never;
      expect(opts.header).toBe(true);
      opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined as never);
      return undefined as never;
    });
    try {
      const dir = mkdtempSync(join(tmpdir(), "csv-hh-"));
      const fp = join(dir, "t.csv");
      writeFileSync(fp, "a\n1", "utf8");
      const deps = baseDeps();
      await parseLargeFileStreaming(
        baseJob({ filePath: fp, encoding: "utf8", hasHeader: undefined }),
        deps,
      );
    } finally {
      parseMock.mockRestore();
    }
  });
});

describe("parseLargeFileStreaming — fără persist mapping fără batchId", () => {
  it("omite persistBatchColumnMapping la sfârșit dacă batchId gol", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-nb-"));
    const fp = join(dir, "t.csv");
    writeFileSync(fp, "a,b\n1,1\n", "utf8");
    const deps = baseDeps({
      getInsertBatchSize: vi.fn(() => 10),
      insertBronzeRows: vi.fn(async () => ({
        rowsInserted: 1,
        errorRows: 0,
        duplicateRows: 0,
        resolvedRows: 1,
        identityConflictRows: 0,
        insufficientIdentifierRows: 0,
        processableIds: ["z"],
      })),
    });
    await parseLargeFileStreaming(jobNoBatch({ filePath: fp, encoding: "utf8" }), deps);
    expect(deps.persistBatchColumnMapping).not.toHaveBeenCalled();
  });
});
