# Traceabilitate ADR în Pull Request-uri

**Scop:** evitarea drift-ului tacit între cod și deciziile arhitecturale documentate în [`docs/adr`](../adr) și [`ADR-INDEX.md`](../adr/ADR-INDEX.md).

## Când este obligatoriu

Pentru PR-uri care ating una sau mai multe dimensiuni de mai jos, completați secțiunea **Architecture & ADRs** din template-ul de PR (sau echivalent în descriere):

| Dimensiune | Exemple ADR-uri de verificat (non-exhaustiv) |
| ---------- | --------------------------------------------- |
| Multi-tenant / date | ADR-0005 (RLS), convenții naming |
| API / contract / CORS | ADR-0011, ADR-0019, ADR-0008 |
| CI/CD / secrete | ADR-0032, ADR-E0-0033 (OpenBao), ADR-0022 (porturi) |
| Workers / cozi | ADR-0006, ADR legate de pipeline și outreach |
| UI / Etape E1–E5 | ADR-uri din etapa corespunzătoare din index |
| Observabilitate | ADR-E0-0034 (orchestrator) |

## Ce scrieți în PR

1. **Listați** ID-urile ADR relevante (link către fișierul din `docs/adr/...`).
2. Dacă implementarea **modifică** o decizie acceptată: propuneți **ADR nou** sau **actualizare explicită** la ADR-ul existent (status Amendat/Superseded) în același PR sau PR următor — fără a lăsa contradicția doar în cod.

## Ce nu este necesar

Schimbări minore (typo, refactor local fără impact arhitectural) nu cer inventar complet de ADR-uri; folosiți judecata profesională și scope-ul epic-ului.
