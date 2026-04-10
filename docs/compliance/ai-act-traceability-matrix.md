# Matrice trasabilitate — cerințe EU AI Act ↔ implementare

**Notă:** articolele sunt rezumate; pentru text oficial folosiți EUR-Lex. **Revizuire juridică** înainte de conformitate declarată.

| Cerință (rezumat) | Art. | Unde în produs |
| --- | --- | --- |
| Management riscuri | 9 | [ai-risk-management-system.md](./ai-risk-management-system.md), ADR-uri etape |
| Guvernanță date | 10 | RLS, GDPR erasure, retention `LLM_AUDIT` |
| Doc. tehnică | 11 | [ai-technical-documentation-models.md](./ai-technical-documentation-models.md) |
| Înregistrări / retenție | 12 | `audit_llm_calls`, politici retenție, observabilitate |
| Transparență utilizator | 13 | UI E3 (ex. `NegotiationConversation` — mesaje AI marcate) |
| Supraveghere umană | 14 | HITL / aprobări (E1/E4) |
| Acuratețe / robustețe | 15 | LLM Guard, guardrails E3, circuit breakers |

## Checkpoint pre-producție

- [ ] Review legal pe clasificare și texte UI.  
- [ ] Verificare retenție și acces la `audit_llm_calls` pentru DPO.
