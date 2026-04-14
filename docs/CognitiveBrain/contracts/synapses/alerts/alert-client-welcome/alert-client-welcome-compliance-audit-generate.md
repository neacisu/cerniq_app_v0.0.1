# Sinapsă `alert-client-welcome-compliance-audit-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-welcome-compliance-audit-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-welcome/alert-client-welcome-compliance-audit-generate.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-welcome` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-client-welcome` | **Matrix:** `alert:client:welcome` — [`../../../neurons/E5/alert--client--welcome.md`](../../../neurons/E5/alert--client--welcome.md). **Gap** registry pentru coada granulară. |
| Destinație (graf) | `compliance-audit-generate` | **Matrix:** `compliance:audit:generate` — [`../../../neurons/E5/compliance--audit--generate.md`](../../../neurons/E5/compliance--audit--generate.md). **Repo:** fără coadă/worker cu acest literal; mapare deschisă către K56–K58 — vezi contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența plasează traseul de alertă **bun venit** în raport cu **generarea auditului de conformitate** din graf. v2: **„sinapsă canonică de pipeline”**. Interpretare conservatoare: planificarea leagă notificarea de recompensă de poziția canonică a neuronului `compliance:audit:generate`; execuția efectivă poate fi dispersată (ex. K56/K58) fără coadă unică cu acest nume.

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

- **Runtime (ADR-0001):** ținta nominală **fără** intrare dedicată în registry; sursa granulară — gap; vezi dovezi în contractul `compliance--audit--generate.md`.
- **Semantic (ADR-0002):** span v2 `cognitive.compliance.audit.generate` vs implementare parțială — vezi neuron.
- **Planificare:** dependență structurală în graf.

## Limite și reconcilieri

- Nu afirma enqueue direct alertă → `compliance:audit:generate` fără cod care o dovedește.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-welcome-compliance-audit-generate\``.
