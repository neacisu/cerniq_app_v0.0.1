import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const DRIZZLE_DIR = join(__dirname, "..", "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");

type DrizzleJournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type DrizzleJournal = {
  version: string;
  dialect: string;
  entries: DrizzleJournalEntry[];
};

function listMigrationTags(): string[] {
  return readdirSync(DRIZZLE_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => basename(file, ".sql"));
}

function readJournal(): DrizzleJournal {
  return JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as DrizzleJournal;
}

describe("Drizzle migration metadata", () => {
  it("keeps _journal.json synchronized with drizzle SQL migrations", () => {
    const migrationTags = listMigrationTags();
    const journal = readJournal();
    const journalTags = journal.entries.map((entry) => entry.tag);

    expect(journalTags).toEqual(migrationTags);
  });

  it("keeps journal indexes contiguous and aligned with entry order", () => {
    const journal = readJournal();
    const journalIndexes = journal.entries.map((entry) => entry.idx);
    const expectedIndexes = journal.entries.map((_, index) => index);

    expect(journalIndexes).toEqual(expectedIndexes);
  });
});
