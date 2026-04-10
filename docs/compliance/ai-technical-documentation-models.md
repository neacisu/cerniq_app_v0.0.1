# Documentație tehnică — modele AI (EU AI Act — Art. 11)

**Sursă inferență:** configurație workers și gateway `infraq.app` (self-hosted).

## Modele în uz (indicativ)

| Rol | Model / serviciu | Observații |
| --- | --- | --- |
| Reasoning E3 | QwQ-32B-AWQ (vLLM) | Latență ridică; folosit pentru decizii complexe negociere |
| Fast E3 | Qwen2.5-14B-Instruct-AWQ | Răspunsuri rapide, temperatură scăzută în cod |
| Embeddings E3 / RAG | qwen3-embedding-8b | Ieșire 3072 dim → `halfvec(3072)` în PostgreSQL |
| Frontier fallback | xAI / OpenAI / alții | Lanț `withLlmFallbackChain`; interzis pentru `dataSensitivity: sensitive` |

## Limitări cunoscute

- Modelele pot genera conținut incorect sau neactualizat — mitigare: guardrails, regenerare, HITL.  
- Embeddings reflectă limba și domeniul din datele de antrenament ale modelului — calitatea RAG depinde de chunking și de calitatea produselor importate.

## Bias

- Datele B2B agro/RO pot sub-reprezenta anumite regiuni sau categorii dacă sursele sunt incomplete — monitorizare calitate în pipeline E1.

**Legal review obligatoriu** înainte de declarații publice de conformitate.
