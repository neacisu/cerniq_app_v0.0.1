# Sinapsă `alert-client-credit-insufficient-audit-compliance-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-credit-insufficient-audit-compliance-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-credit-insufficient/alert-client-credit-insufficient-audit-compliance-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-credit-insufficient` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-client-credit-insufficient` | **Matrix:** `alert:client:credit-insufficient` — [`../../../neurons/E4/alert--client--credit-insufficient.md`](../../../neurons/E4/alert--client--credit-insufficient.md). **Gap** registry pentru coada granulară; alerte generice `alert:*` în cod. |
| Destinație (graf) | `audit-compliance-check` | **Matrix:** `audit:compliance:check` — [`../../../neurons/E4/audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md). Contractul neuron: **fără** coadă nominală în registry; fluxul cel mai apropiat implementat este **`audit:chain:verify`** (J46) — reconciliere explicită necesară, fără echivalență 1:1. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența plasează în graf traseul de alertă credit insuficient în raport cu verificarea de conformitate audit. v2 pentru sinapsă: **„sinapsă canonică de pipeline”** — fără schemă de mesaj. Interpretare conservatoare: planificarea leagă emisia/fluxul de alertă de lanțul de control conformitate asupra jurnalului audit; implementarea efectivă a „compliance check” poate fi **alt nume de coadă** (J46), vezi contractul neuron destinație.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă granulară **fără** intrare dedicată în registry; ținta nominală v2 **fără** intrare; există `E4_AUDIT_CHAIN_VERIFY` → `audit:chain:verify` — vezi [`audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md).
- **Semantic (ADR-0002):** vezi gap-urile din ambele contracte neuron.
- **Planificare:** dependență structurală în graf.

## Limite și reconcilieri

- Nu afirma că un job `alert:client:credit-insufficient` enfilează direct `audit:compliance:check` fără dovezi suplimentare în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-credit-insufficient-audit-compliance-check\``.
