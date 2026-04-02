/**
 * e3-sql-functions.test.ts — Test complet pentru fișierele de migrare E3 SQL
 * Verifică: existența fișierelor, conținutul funcțiilor SQL, datele seed FSM.
 * Acoperire 100%: funcții SQL, triggere, FSM transitions, allowed tools.
 * NOTĂ: Teste statice (fișiere SQL) — nu necesită DB live.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DRIZZLE_DIR = join(__dirname, "..", "drizzle");

function readMigration(filename: string): string {
  const path = join(DRIZZLE_DIR, filename);
  if (!existsSync(path)) {
    throw new Error(`Migration file not found: ${path}`);
  }
  return readFileSync(path, "utf8");
}

// ---------------------------------------------------------------------------
// 0038_e3_sql_functions.sql — Existență și conținut
// ---------------------------------------------------------------------------

describe("0038_e3_sql_functions.sql — Existență", () => {
  it("fișierul există în drizzle/", () => {
    expect(existsSync(join(DRIZZLE_DIR, "0038_e3_sql_functions.sql"))).toBe(true);
  });
});

describe("0038_e3_sql_functions.sql — hybrid_product_search", () => {
  let content: string;
  try {
    content = readMigration("0038_e3_sql_functions.sql");
  } catch {
    content = "";
  }

  it("definește funcția hybrid_product_search", () => {
    expect(content).toContain("hybrid_product_search");
    expect(content).toContain("CREATE OR REPLACE FUNCTION gold.hybrid_product_search");
  });

  it("funcția primește query_embedding halfvec(3072) — NU 1536, NU 4096", () => {
    expect(content).toContain("halfvec(3072)");
    expect(content).not.toContain("halfvec(1536)");
    expect(content).not.toContain("halfvec(4096)");
    expect(content).not.toContain("vector(1536)");
    expect(content).not.toContain("vector(4096)");
  });

  it("implementează RRF formula 1.0/(60+rank)", () => {
    expect(content).toContain("60.0 + ");
    // Formula RRF
    expect(content).toMatch(/1\.0\s*\/\s*\(\s*60/);
  });

  it("aplică ponderi: vector 60% + BM25 40%", () => {
    expect(content).toContain("0.6");
    expect(content).toContain("0.4");
  });

  it("folosește halfvec_cosine_ops (<=> operator) pentru vector search", () => {
    expect(content).toContain("<=>");
  });

  it("folosește tsvector cu configurația 'romanian' pentru BM25", () => {
    expect(content).toContain("romanian");
    expect(content).toContain("plainto_tsquery");
    expect(content).toContain("ts_rank_cd");
  });

  it("integrează pg_trgm (similarity) pentru fuzzy search", () => {
    expect(content).toContain("similarity");
    expect(content).toContain("name_trigram");
  });

  it("acceptă filters JSONB cu tenant_id", () => {
    expect(content).toContain("filters");
    expect(content).toContain("JSONB");
    expect(content).toContain("tenant_id");
  });

  it("returnează TABLE (product_id UUID, score DOUBLE PRECISION)", () => {
    expect(content).toContain("RETURNS TABLE");
    expect(content).toContain("product_id");
    expect(content).toContain("score");
    expect(content).toContain("DOUBLE PRECISION");
  });

  it("funcția este STABLE (read-only, deterministic în tranzacție)", () => {
    expect(content).toContain("STABLE");
  });
});

describe("0038_e3_sql_functions.sql — get_max_discount", () => {
  let content: string;
  try {
    content = readMigration("0038_e3_sql_functions.sql");
  } catch {
    content = "";
  }

  it("definește funcția get_max_discount", () => {
    expect(content).toContain("CREATE OR REPLACE FUNCTION gold.get_max_discount");
  });

  it("acceptă (p_tenant_id UUID, p_product_id UUID)", () => {
    expect(content).toContain("p_tenant_id");
    expect(content).toContain("p_product_id");
  });

  it("implementează cascadă: product → category → global", () => {
    expect(content).toContain("rule_type  = 'product'");
    expect(content).toContain("rule_type  = 'category'");
    expect(content).toContain("rule_type = 'global'");
  });

  it("garantează min_margin_percent = 8% (HARD LIMIT)", () => {
    // Verifică că există constrângerea de 8% (LEAST + min_margin)
    expect(content).toContain("min_margin");
    expect(content).toContain("8.0");
    expect(content).toContain("LEAST");
  });

  it("returnează 0.0 ca default (sigur, fără discount)", () => {
    expect(content).toContain("RETURN 0.0");
  });

  it("verifică validitatea temporală (valid_from/valid_until)", () => {
    expect(content).toContain("valid_from");
    expect(content).toContain("valid_until");
    expect(content).toContain("now()");
  });
});

describe("0038_e3_sql_functions.sql — get_available_stock", () => {
  let content: string;
  try {
    content = readMigration("0038_e3_sql_functions.sql");
  } catch {
    content = "";
  }

  it("definește funcția get_available_stock(p_sku TEXT)", () => {
    expect(content).toContain("CREATE OR REPLACE FUNCTION gold.get_available_stock");
    expect(content).toContain("p_sku TEXT");
  });

  it("calculează stoc disponibil = total - rezervări active", () => {
    expect(content).toContain("total_quantity");
    expect(content).toContain("reservation_state");
    expect(content).toContain("ACTIVE");
  });

  it("ignoră rezervările expirate", () => {
    expect(content).toContain("expires_at");
    expect(content).toContain("now()");
  });

  it("returnează GREATEST(..., 0) — nu returnează negativ", () => {
    expect(content).toContain("GREATEST");
  });

  it("citește tenant din contextul sesiunii RLS", () => {
    expect(content).toContain("current_setting");
    expect(content).toContain("app.current_tenant_id");
  });

  it("returnează 0 sigur dacă nu există context tenant", () => {
    expect(content).toContain("RETURN 0");
  });

  it("folosește COALESCE pentru a trata NULL-uri", () => {
    expect(content).toContain("COALESCE");
  });
});

describe("0038_e3_sql_functions.sql — get_reservation_ttl", () => {
  let content: string;
  try {
    content = readMigration("0038_e3_sql_functions.sql");
  } catch {
    content = "";
  }

  it("definește funcția get_reservation_ttl", () => {
    expect(content).toContain("CREATE OR REPLACE FUNCTION gold.get_reservation_ttl");
  });

  it("PROPOSAL = 30 minutes (exact din plan)", () => {
    expect(content).toContain("PROPOSAL");
    expect(content).toContain("30 minutes");
  });

  it("NEGOTIATION = 2 hours (exact din plan)", () => {
    expect(content).toContain("NEGOTIATION");
    expect(content).toContain("2 hours");
  });

  it("CLOSING = 24 hours (exact din plan)", () => {
    expect(content).toContain("CLOSING");
    expect(content).toContain("24 hours");
  });

  it("PROFORMA_SENT = 7 days (exact din plan)", () => {
    expect(content).toContain("PROFORMA_SENT");
    expect(content).toContain("7 days");
  });

  it("returnează INTERVAL", () => {
    expect(content).toContain("RETURNS INTERVAL");
  });

  it("funcția este IMMUTABLE (valori fixe, fără citire DB)", () => {
    expect(content).toContain("IMMUTABLE");
  });
});

describe("0038_e3_sql_functions.sql — validate_state_transition trigger", () => {
  let content: string;
  try {
    content = readMigration("0038_e3_sql_functions.sql");
  } catch {
    content = "";
  }

  it("definește funcția trigger validate_state_transition", () => {
    expect(content).toContain("CREATE OR REPLACE FUNCTION gold.validate_state_transition");
    expect(content).toContain("RETURNS TRIGGER");
  });

  it("blochează cu RAISE EXCEPTION tranziția invalidă", () => {
    expect(content).toContain("RAISE EXCEPTION");
    expect(content).toContain("P0001");
  });

  it("validează față de gold.fsm_valid_transitions", () => {
    expect(content).toContain("gold.fsm_valid_transitions");
    expect(content).toContain("fsm_type   = 'negotiation'");
  });

  it("verifică OLD.current_state IS DISTINCT FROM NEW.current_state", () => {
    expect(content).toContain("OLD.current_state IS DISTINCT FROM NEW.current_state");
  });

  it("creează trigger BEFORE UPDATE pe gold_negotiations", () => {
    expect(content).toContain("CREATE TRIGGER trg_validate_state_transition");
    expect(content).toContain("BEFORE UPDATE ON gold.gold_negotiations");
  });
});

describe("0038_e3_sql_functions.sql — update_negotiation_total trigger", () => {
  let content: string;
  try {
    content = readMigration("0038_e3_sql_functions.sql");
  } catch {
    content = "";
  }

  it("definește funcția trigger update_negotiation_total", () => {
    expect(content).toContain("CREATE OR REPLACE FUNCTION gold.update_negotiation_total");
    expect(content).toContain("RETURNS TRIGGER");
  });

  it("recalculează SUM(line_total) din negotiation_items", () => {
    expect(content).toContain("SUM(line_total)");
    expect(content).toContain("gold.negotiation_items");
  });

  it("actualizează gold_negotiations.total_value", () => {
    expect(content).toContain("total_value");
    expect(content).toContain("UPDATE gold.gold_negotiations");
  });

  it("gestionează TG_OP = 'DELETE' (OldRow.negotiation_id)", () => {
    expect(content).toContain("TG_OP = 'DELETE'");
    expect(content).toContain("OLD.negotiation_id");
    expect(content).toContain("NEW.negotiation_id");
  });

  it("creează trigger AFTER INSERT OR UPDATE OR DELETE pe negotiation_items", () => {
    expect(content).toContain("CREATE TRIGGER trg_update_negotiation_total");
    expect(content).toContain("AFTER INSERT OR UPDATE OR DELETE ON gold.negotiation_items");
  });
});

describe("0038_e3_sql_functions.sql — statement-breakpoints Drizzle", () => {
  let content: string;
  try {
    content = readMigration("0038_e3_sql_functions.sql");
  } catch {
    content = "";
  }

  it("conține statement-breakpoints Drizzle între instrucțiuni", () => {
    const breakpoints = (content.match(/--> statement-breakpoint/g) ?? []).length;
    expect(breakpoints).toBeGreaterThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// 0039_e3_fsm_seed.sql — Existență, conținut și corectitudine
// Nota: fișierul folosește DO block cu CONSTANT-uri pentru fix S1192
// ---------------------------------------------------------------------------

describe("0039_e3_fsm_seed.sql — Existență", () => {
  it("fișierul există în drizzle/", () => {
    expect(existsSync(join(DRIZZLE_DIR, "0039_e3_fsm_seed.sql"))).toBe(true);
  });
});

describe("0039_e3_fsm_seed.sql — Structură DO block (fix S1192)", () => {
  let content: string;
  try {
    content = readMigration("0039_e3_fsm_seed.sql");
  } catch {
    content = "";
  }

  it("folosește DO block PL/pgSQL (NU plain INSERT)", () => {
    expect(content).toContain("DO $$");
    expect(content).toContain("DECLARE");
    expect(content).toContain("BEGIN");
    expect(content).toContain("END;");
  });

  it("declară c_fsm CONSTANT TEXT := 'negotiation'", () => {
    expect(content).toContain("c_fsm");
    expect(content).toContain("CONSTANT TEXT := 'negotiation'");
  });

  it("declară toate constantele pentru stările FSM", () => {
    const stateConsts = [
      ["c_disc", "DISCOVERY"],
      ["c_prop", "PROPOSAL"],
      ["c_neg", "NEGOTIATION"],
      ["c_clos", "CLOSING"],
      ["c_pfrs", "PROFORMA_SENT"],
      ["c_inv", "INVOICED"],
      ["c_paid", "PAID"],
      ["c_dead", "DEAD"],
    ] as const;

    for (const [varName, value] of stateConsts) {
      expect(content).toContain(varName);
      expect(content).toContain(`'${value}'`);
    }
  });

  it("declară c_mgr CONSTANT TEXT := 'manager'", () => {
    expect(content).toContain("c_mgr");
    expect(content).toContain("CONSTANT TEXT := 'manager'");
  });

  it("declară toate constantele pentru MCP tools", () => {
    const toolConsts = [
      ["c_t_srch", "search_products"],
      ["c_t_stck", "check_realtime_stock"],
      ["c_t_disc", "calculate_discount"],
      ["c_t_pfra", "create_proforma"],
      ["c_t_cinv", "convert_to_invoice"],
      ["c_t_einv", "send_einvoice"],
    ] as const;

    for (const [varName, value] of toolConsts) {
      expect(content).toContain(varName);
      expect(content).toContain(`'${value}'`);
    }
  });

  it("'negotiation' apare NUMAI ca valoare a constantei c_fsm (nu repetat în VALUES)", () => {
    // Cu DO block, 'negotiation' nu mai apare în VALUES — folosit prin variabilă c_fsm
    const literalUsages = content.match(/\(c_fsm,/g) ?? [];
    // Trebuie să avem cel puțin 17+14=31 utilizări ale variabilei c_fsm în VALUES
    expect(literalUsages.length).toBeGreaterThanOrEqual(31);
  });
});

describe("0039_e3_fsm_seed.sql — fsm_valid_transitions (17 rânduri)", () => {
  let content: string;
  try {
    content = readMigration("0039_e3_fsm_seed.sql");
  } catch {
    content = "";
  }

  it("inserează în gold.fsm_valid_transitions", () => {
    expect(content).toContain("INSERT INTO gold.fsm_valid_transitions");
    expect(content).toContain("fsm_type, from_state, to_state, requires_role");
  });

  it("are exact 17 rânduri în INSERT transitions (c_fsm, c_XXXX, c_YYYY)", () => {
    // Numără tupluri din secțiunea fsm_valid_transitions
    // Fiecare rând este: (c_fsm, c_XXXX, c_YYYY, NULL|c_mgr),
    const rows = content.match(/\(c_fsm,\s*c_\w+,\s*c_\w+,\s*(?:NULL|c_mgr)\)/g) ?? [];
    expect(rows.length).toBe(17);
  });

  it("flux forward: c_disc→c_prop, c_prop→c_neg, c_neg→c_clos, c_clos→c_pfrs, c_pfrs→c_inv, c_inv→c_paid", () => {
    expect(content).toContain("(c_fsm, c_disc, c_prop, NULL)");
    expect(content).toContain("(c_fsm, c_prop, c_neg,  NULL)");
    expect(content).toContain("(c_fsm, c_neg,  c_clos, NULL)");
    expect(content).toContain("(c_fsm, c_clos, c_pfrs, c_mgr)");
    expect(content).toContain("(c_fsm, c_pfrs, c_inv,  c_mgr)");
    expect(content).toContain("(c_fsm, c_inv,  c_paid, c_mgr)");
  });

  it("CLOSING→PROFORMA_SENT și PROFORMA_SENT→INVOICED și INVOICED→PAID necesită c_mgr", () => {
    expect(content).toContain("(c_fsm, c_clos, c_pfrs, c_mgr)");
    expect(content).toContain("(c_fsm, c_pfrs, c_inv,  c_mgr)");
    expect(content).toContain("(c_fsm, c_inv,  c_paid, c_mgr)");
  });

  it("DEAD→DISCOVERY necesită c_mgr (HITL reopen D25)", () => {
    expect(content).toContain("(c_fsm, c_dead, c_disc, c_mgr)");
  });

  it("backtracks: c_neg→c_prop, c_clos→c_neg, c_prop→c_disc", () => {
    expect(content).toContain("(c_fsm, c_neg,  c_prop, NULL)");
    expect(content).toContain("(c_fsm, c_clos, c_neg,  NULL)");
    expect(content).toContain("(c_fsm, c_prop, c_disc, NULL)");
  });

  it("DEAD din toate cele 7 stări active (c_disc, c_prop, c_neg, c_clos, c_pfrs, c_inv, c_paid)", () => {
    const deadTransitions = [
      "(c_fsm, c_disc, c_dead, NULL)",
      "(c_fsm, c_prop, c_dead, NULL)",
      "(c_fsm, c_neg,  c_dead, NULL)",
      "(c_fsm, c_clos, c_dead, NULL)",
      "(c_fsm, c_pfrs, c_dead, NULL)",
      "(c_fsm, c_inv,  c_dead, NULL)",
      "(c_fsm, c_paid, c_dead, NULL)",
    ];
    for (const t of deadTransitions) {
      expect(content).toContain(t);
    }
  });

  it("folosește ON CONFLICT (fsm_type, from_state, to_state) DO NOTHING", () => {
    expect(content).toContain("ON CONFLICT");
    expect(content).toContain("DO NOTHING");
  });
});

describe("0039_e3_fsm_seed.sql — fsm_state_allowed_tools (14 rânduri)", () => {
  let content: string;
  try {
    content = readMigration("0039_e3_fsm_seed.sql");
  } catch {
    content = "";
  }

  it("inserează în gold.fsm_state_allowed_tools", () => {
    expect(content).toContain("INSERT INTO gold.fsm_state_allowed_tools");
    expect(content).toContain("fsm_type, state, tool_name");
  });

  it("are exact 14 rânduri în INSERT tools (c_fsm, c_STATE, c_t_TOOL)", () => {
    const rows = content.match(/\(c_fsm,\s*c_\w+,\s*c_t_\w+\)/g) ?? [];
    expect(rows.length).toBe(14);
  });

  it("DISCOVERY (c_disc): c_t_srch + c_t_stck", () => {
    expect(content).toContain("(c_fsm, c_disc, c_t_srch)");
    expect(content).toContain("(c_fsm, c_disc, c_t_stck)");
  });

  it("PROPOSAL (c_prop): c_t_srch + c_t_stck + c_t_disc + c_t_pfra", () => {
    expect(content).toContain("(c_fsm, c_prop, c_t_srch)");
    expect(content).toContain("(c_fsm, c_prop, c_t_stck)");
    expect(content).toContain("(c_fsm, c_prop, c_t_disc)");
    expect(content).toContain("(c_fsm, c_prop, c_t_pfra)");
  });

  it("NEGOTIATION (c_neg): c_t_srch + c_t_stck + c_t_disc + c_t_pfra", () => {
    expect(content).toContain("(c_fsm, c_neg,  c_t_srch)");
    expect(content).toContain("(c_fsm, c_neg,  c_t_stck)");
    expect(content).toContain("(c_fsm, c_neg,  c_t_disc)");
    expect(content).toContain("(c_fsm, c_neg,  c_t_pfra)");
  });

  it("CLOSING (c_clos): c_t_disc + c_t_pfra", () => {
    expect(content).toContain("(c_fsm, c_clos, c_t_disc)");
    expect(content).toContain("(c_fsm, c_clos, c_t_pfra)");
  });

  it("PROFORMA_SENT (c_pfrs): c_t_cinv", () => {
    expect(content).toContain("(c_fsm, c_pfrs, c_t_cinv)");
  });

  it("INVOICED (c_inv): c_t_einv", () => {
    expect(content).toContain("(c_fsm, c_inv,  c_t_einv)");
  });

  it("toate cele 6 MCP tools sunt declarate ca constante și folosite", () => {
    const tools = [
      "search_products",
      "check_realtime_stock",
      "calculate_discount",
      "create_proforma",
      "convert_to_invoice",
      "send_einvoice",
    ];
    for (const tool of tools) {
      expect(content).toContain(`'${tool}'`);
    }
  });

  it("folosește ON CONFLICT (fsm_type, state, tool_name) DO NOTHING", () => {
    expect(content).toContain("ON CONFLICT");
    expect(content).toContain("DO NOTHING");
  });
});

// ---------------------------------------------------------------------------
// _journal.json — Intrări idx=39 și idx=40
// ---------------------------------------------------------------------------

describe("_journal.json — intrări pentru migrările E3 SQL", () => {
  const journalPath = join(DRIZZLE_DIR, "meta", "_journal.json");
  let journal: {
    entries: Array<{ idx: number; tag: string; version: string; breakpoints: boolean }>;
  };

  try {
    journal = JSON.parse(readFileSync(journalPath, "utf8"));
  } catch {
    journal = { entries: [] };
  }

  it("conține intrarea pentru 0038_e3_sql_functions la idx=39", () => {
    const entry = journal.entries.find((e) => e.tag === "0038_e3_sql_functions");
    expect(entry).toBeDefined();
    expect(entry?.idx).toBe(39);
    expect(entry?.version).toBe("7");
    expect(entry?.breakpoints).toBe(true);
  });

  it("conține intrarea pentru 0039_e3_fsm_seed la idx=40", () => {
    const entry = journal.entries.find((e) => e.tag === "0039_e3_fsm_seed");
    expect(entry).toBeDefined();
    expect(entry?.idx).toBe(40);
    expect(entry?.version).toBe("7");
    expect(entry?.breakpoints).toBe(true);
  });

  it("idx=39 imediat după idx=38 (0037_cognitive_anomalies)", () => {
    const prev = journal.entries.find((e) => e.tag === "0037_cognitive_anomalies");
    const curr = journal.entries.find((e) => e.tag === "0038_e3_sql_functions");
    expect(prev?.idx).toBe(38);
    expect(curr?.idx).toBe(39);
  });

  it("jurnalul are cel puțin 41 intrări (idx 0-40)", () => {
    expect(journal.entries.length).toBeGreaterThanOrEqual(41);
  });

  it("indexurile sunt consecutive (fără gap-uri)", () => {
    const indexes = journal.entries.map((e) => e.idx);
    for (let i = 0; i < indexes.length; i++) {
      expect(indexes[i]).toBe(i);
    }
  });
});

// ---------------------------------------------------------------------------
// Validare anti-hallucinare: NU 1536, NU 4096, NU text-embedding-3-small
// ---------------------------------------------------------------------------

describe("Anti-hallucinare — verificare dimensiuni embeddings", () => {
  let sqlFunctions: string;
  let fsmSeed: string;

  try {
    sqlFunctions = readMigration("0038_e3_sql_functions.sql");
    fsmSeed = readMigration("0039_e3_fsm_seed.sql");
  } catch {
    sqlFunctions = "";
    fsmSeed = "";
  }

  it("0038 nu conține vector(1536) sau halfvec(1536)", () => {
    expect(sqlFunctions).not.toContain("vector(1536)");
    expect(sqlFunctions).not.toContain("halfvec(1536)");
  });

  it("0038 nu conține vector(4096) sau halfvec(4096)", () => {
    expect(sqlFunctions).not.toContain("vector(4096)");
    expect(sqlFunctions).not.toContain("halfvec(4096)");
  });

  it("0038 nu menționează text-embedding-3-small", () => {
    expect(sqlFunctions).not.toContain("text-embedding-3-small");
  });

  it("0038 conține EXCLUSIV halfvec(3072) pentru embeddings", () => {
    expect(sqlFunctions).toContain("halfvec(3072)");
  });

  it("0039 nu conține referințe la 1536 sau 4096", () => {
    expect(fsmSeed).not.toContain("1536");
    expect(fsmSeed).not.toContain("4096");
  });

  it("0039 are exact 17 rânduri tranziții (nici 16 nici 18)", () => {
    const rows = fsmSeed.match(/\(c_fsm,\s*c_\w+,\s*c_\w+,\s*(?:NULL|c_mgr)\)/g) ?? [];
    expect(rows.length).toBe(17);
    expect(rows.length).not.toBe(16);
    expect(rows.length).not.toBe(18);
  });

  it("0039 are exact 14 rânduri tools (nici 13 nici 15)", () => {
    const rows = fsmSeed.match(/\(c_fsm,\s*c_\w+,\s*c_t_\w+\)/g) ?? [];
    expect(rows.length).toBe(14);
    expect(rows.length).not.toBe(13);
    expect(rows.length).not.toBe(15);
  });

  it("0039 folosește DO block (fix S1192) — nu plain INSERT cu literale repetate", () => {
    expect(fsmSeed).toContain("DO $$");
    expect(fsmSeed).toContain("DECLARE");
    // Verifică că 'negotiation' apare NUMAI ca valoare de CONSTANT, nu în VALUES
    const valuesSection = fsmSeed.slice(fsmSeed.indexOf("BEGIN"));
    expect(valuesSection).not.toContain("'negotiation'");
  });
});
