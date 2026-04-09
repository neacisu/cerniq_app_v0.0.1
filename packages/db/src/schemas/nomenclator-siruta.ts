import { index, integer, pgEnum, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core";

/** Tip localitate conform nomenclatorului SIRUTA (ANIS). */
export const sirutaLocalityTypeEnum = pgEnum("siruta_locality_type_enum", [
  "JUDET",
  "MUNICIPIU",
  "ORAS",
  "COMUNA",
  "SAT",
]);

/** Mediu urban / rural. */
export const sirutaMediuEnum = pgEnum("siruta_mediul_enum", ["U", "R"]);

/**
 * Nomenclator SIRUTA — date de referință naționale (fără tenant_id, fără RLS).
 * Populare: job ETL / seed din surse oficiale.
 */
export const nomenclatorSiruta = pgTable(
  "nomenclator_siruta",
  {
    codSiruta: integer("cod_siruta").primaryKey(),
    denumire: text("denumire").notNull(),
    tip: sirutaLocalityTypeEnum("tip").notNull(),
    judet: varchar("judet", { length: 64 }),
    mediu: sirutaMediuEnum("mediu").notNull(),
    codJudet: smallint("cod_judet"),
  },
  (t) => [
    index("idx_nomenclator_siruta_judet").on(t.codJudet),
    index("idx_nomenclator_siruta_denumire").on(t.denumire),
  ],
);
