# Politică de eșantionare trace-uri (OpenTelemetry) — Cerniq API / workers

## Obiectiv

Controlul costului de stocare și ingestie OTLP, păstrând **reprezentativitate** pentru debugging și SLO-uri. Nu folosim **AlwaysOn** ca implicit în **producție** fără decizie explicită de volum.

## Comportament implementat (head-based, SDK Node)

| Mediu / env | Efect |
| ----------- | ------ |
| `NODE_ENV=production` și **lipsește** `OTEL_TRACES_SAMPLER` | `ParentBasedSampler` cu rădăcină `TraceIdRatioBasedSampler` — rată implicită **0.1** (10%). Rata: `CERNIQ_OTEL_TRACE_SAMPLING_RATIO` sau `OTEL_TRACES_SAMPLER_ARG`, apoi `0.1`. |
| `NODE_ENV` ≠ `production` și lipsește `OTEL_TRACES_SAMPLER` | `parentbased_always_on` — toate trace-urile noi locale sunt eșantionate (DX). |
| `OTEL_TRACES_SAMPLER=always_on` | Explicit: tot fluxul rădăcină eșantionat — **folosiți doar** dacă volumul este cunoscut și bugetul OTLP acceptă. |
| `OTEL_TRACES_SAMPLER=parentbased_traceidratio` | Rata din `OTEL_TRACES_SAMPLER_ARG` sau `CERNIQ_OTEL_TRACE_SAMPLING_RATIO`. |
| `OTEL_TRACES_SAMPLER=always_off` | Dezactivare eșantionare rădăcină (trace-uri locale noi rare). |
| Baggage W3C `cerniq.trace.force_sample=1` | Forțează `RECORD_AND_SAMPLE` pentru span-ul evaluat — suport / reproducere țintită. |

## Ce **nu** face SDK-ul (limită head-based)

- **100% din cererile care eșuează (5xx)** nu pot fi garantate doar cu sampling la începutul cererii: decizia de eșantionare are loc **înainte** de execuția handler-ului.
- Soluție industrie: **tail sampling** în OpenTelemetry Collector (ex. polity „sample dacă `status_code=ERROR` sau latență > prag”). Configurați collectorul pentru a păstra toate span-urile din trace-uri cu erori.

## Impact cost (orientativ)

- Rata `r` este proporțională cu fracția de trace-uri rădăcină păstrate; span-urile copil urmează decizia părintelui (ParentBased).
- Creștere aproximativ liniară a volumului OTLP când creșteți `r` (ex. de la 0.1 la 1.0).
- **AlwaysOn** în producție la trafic mare poate crește costul OTLP cu un ordin de mărime față de `r=0.1` — validați în staging.

## Variabile de mediu (rezumat)

| Variabilă | Rol |
| --------- | --- |
| `OTEL_TRACES_SAMPLER` | Nume sampler OTel (opțional; implicit derivat din `NODE_ENV`). |
| `OTEL_TRACES_SAMPLER_ARG` | Argument numeric pentru ratio (compat OTel). |
| `CERNIQ_OTEL_TRACE_SAMPLING_RATIO` | Preferință Cerniq pentru rată [0,1] (are prioritate față de `OTEL_TRACES_SAMPLER_ARG` la parsarea raportului în codul nostru). |
| `OTEL_SDK_DISABLED=true` | Dezactivează complet SDK-ul (fără export). |

## Referințe cod

- `packages/observability/src/trace-sampling.ts` — construcție sampler.
- `packages/observability/src/init.ts` — înregistrare în `NodeSDK`.
