import { describe, expect, it, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("fetchAnafSingleByCui", () => {
  it("delegates to fetchAnafBatchByCuis and returns a typed record", async () => {
    const mockRecord = {
      date_generale: {
        cui: 12345678,
        denumire: "Test SRL",
        adresa: "Str. Test 1",
        stare_inregistrare: "INREGISTRAT",
        cod_CAEN: "0111",
        nrRegCom: "J09/98/2003",
        data: "",
        telefon: "",
        fax: "",
        codPostal: "",
        act: "",
        data_inregistrare: "",
        iban: "",
        statusRO_e_Factura: false,
        organFiscalCompetent: "",
        forma_de_proprietate: "",
        forma_organizare: "",
        forma_juridica: "",
      },
      inregistrare_scop_Tva: { scpTVA: true, perioade_TVA: [] },
      inregistrare_RTVAI: {
        dataInceputTvaInc: "",
        dataSfarsitTvaInc: "",
        dataActualizareTvaInc: "",
        dataPublicareTvaInc: "",
        tipActTvaInc: "",
        statusTvaIncasare: false,
      },
      stare_inactiv: {
        dataInactivare: "",
        dataReactivare: "",
        dataPublicare: "",
        dataRadiere: "",
        statusInactivi: false,
      },
      inregistrare_SplitTVA: {
        dataInceputSplitTVA: "",
        dataAnulareSplitTVA: "",
        statusSplitTVA: false,
      },
      adresa_sediu_social: {},
      adresa_domiciliu_fiscal: {},
    };

    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        cod: 200,
        message: "OK",
        found: [mockRecord],
        notFound: [],
      }),
    }));
    vi.stubGlobal("fetch", mockFetch);

    const { fetchAnafSingleByCui } = await import("./anaf-api-client.js");

    const result = await fetchAnafSingleByCui("12345678");

    expect(result).not.toBeNull();
    expect(result?.date_generale.cui).toBe(12345678);
    expect(result?.date_generale.denumire).toBe("Test SRL");
    expect(result?.inregistrare_scop_Tva.scpTVA).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when CUI is not found", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        cod: 200,
        message: "OK",
        found: [],
        notFound: [99999999],
      }),
    }));
    vi.stubGlobal("fetch", mockFetch);

    const { fetchAnafSingleByCui } = await import("./anaf-api-client.js");
    const result = await fetchAnafSingleByCui("99999999");

    expect(result).toBeNull();
  });

  it("returns null for non-numeric CUI input", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ cod: 200, message: "OK", found: [], notFound: [] }),
    }));
    vi.stubGlobal("fetch", mockFetch);

    const { fetchAnafSingleByCui } = await import("./anaf-api-client.js");
    const result = await fetchAnafSingleByCui("invalid");

    expect(result).toBeNull();
  });
});
