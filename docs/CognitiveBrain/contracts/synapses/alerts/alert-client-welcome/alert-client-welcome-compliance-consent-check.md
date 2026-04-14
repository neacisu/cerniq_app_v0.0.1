# Sinapsă `alert-client-welcome-compliance-consent-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-welcome-compliance-consent-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-welcome/alert-client-welcome-compliance-consent-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-welcome` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-client-welcome` | **Matrix:** `alert:client:welcome` — [`../../../neurons/E5/alert--client--welcome.md`](../../../neurons/E5/alert--client--welcome.md). **Gap** registry pentru coada granulară. |
| Destinație (graf) | `compliance-consent-check` | **Matrix:** `compliance:consent:check` — [`../../../neurons/E5/compliance--consent--check.md`](../../../neurons/E5/compliance--consent--check.md). **Mapare runtime:** echivalent principal **`compliance:gdpr:check`** (K56, `E5_COMPLIANCE_GDPR_CHECK`) — **fără** echivalență 1:1 cu numele v2. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă alertarea de **bun venit** de verificarea **consimțământ / conformitate** în planificare. v2: **„sinapsă canonică de pipeline”**. În cod, logica apropiată este K56 + ciclul `referral:consent:*` — vezi contractul neuron, fără a pretinde că alerta enfilează direct jobul nominal.

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

- **Runtime (ADR-0001):** K56 verificabil; numele `compliance:consent:check` **lipsește** ca literal în registry.
- **Semantic (ADR-0002):** `e5:compliance:gdpr-check` în catalog — vezi neuron.
- **Planificare:** dependență declarată în export.

## Limite și reconcilieri

- Consent referral și GDPR check sunt căi înrudite dar distincte în cod; sinapsa reflectă doar graful v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-welcome-compliance-consent-check\``.
