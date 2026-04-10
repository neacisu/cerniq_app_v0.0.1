/**
 * Politică head-based sampling pentru NodeSDK — configurare env, fără AlwaysOn implicit în producție.
 *
 * - Producție fără `OTEL_TRACES_SAMPLER`: `parentbased_traceidratio` cu rată din env (implicit 0.1).
 * - Non-producție fără env: `parentbased_always_on` (DX local / test).
 * - `OTEL_TRACES_SAMPLER` standard OTel: `always_on`, `always_off`, `traceidratio`, `parentbased_traceidratio`, `parentbased_always_on`.
 * - Baggage `cerniq.trace.force_sample=1` → eșantionare forțată (debug / support), peste rata de bază.
 *
 * Eșantionare 100% pentru răspunsuri 5xx la head-based nu e posibilă fără tail sampling în collector;
 * vezi `docs/developer-guide/otel-sampling-policy.md`.
 */
import type { Attributes, Context, Link, SpanKind } from "@opentelemetry/api";
import { propagation } from "@opentelemetry/api";
import type { Sampler, SamplingResult } from "@opentelemetry/sdk-trace-base";
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  ParentBasedSampler,
  SamplingDecision,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";

/** Cheie baggage: setează valoarea `1` pentru a forța RECORD_AND_SAMPLED pe span-ul curent. */
export const CERNIQ_TRACE_BAGGAGE_FORCE_SAMPLE = "cerniq.trace.force_sample";

function parseRatio(): number {
  const raw =
    process.env.CERNIQ_OTEL_TRACE_SAMPLING_RATIO ?? process.env.OTEL_TRACES_SAMPLER_ARG ?? "0.1";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0.1;
  return Math.min(1, Math.max(0, n));
}

/**
 * Rezolvă numele efectiv al sampler-ului OTEL (înainte de `ParentBasedSampler` + baggage wrapper).
 * Folosit în teste și documentație.
 */
export function resolveEffectiveOtlpSamplerName(): string {
  const explicit = process.env.OTEL_TRACES_SAMPLER?.trim();
  if (explicit) return explicit.toLowerCase();

  const nodeEnv = (process.env.NODE_ENV ?? "development").toLowerCase();
  if (nodeEnv === "production") {
    return "parentbased_traceidratio";
  }
  return "parentbased_always_on";
}

class BaggageForceSampleSampler implements Sampler {
  constructor(private readonly delegate: Sampler) {}

  shouldSample(
    ctx: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[],
  ): SamplingResult {
    const baggage = propagation.getBaggage(ctx);
    const force = baggage?.getEntry(CERNIQ_TRACE_BAGGAGE_FORCE_SAMPLE)?.value;
    if (force === "1" || force === "true") {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    return this.delegate.shouldSample(ctx, traceId, spanName, spanKind, attributes, links);
  }

  toString(): string {
    return `BaggageForceSampleSampler(${String(this.delegate)})`;
  }
}

function buildInnerRootSampler(name: string): Sampler {
  const ratio = parseRatio();
  const prod = (process.env.NODE_ENV ?? "").toLowerCase() === "production";
  switch (name) {
    case "always_on":
      return new AlwaysOnSampler();
    case "always_off":
      return new AlwaysOffSampler();
    case "traceidratio":
    case "parentbased_traceidratio":
      return new TraceIdRatioBasedSampler(ratio);
    case "parentbased_always_on":
      return new AlwaysOnSampler();
    default:
      /** Valoare OTEL necunoscută: în producție nu revenim la AlwaysOn (cost). */
      return prod ? new TraceIdRatioBasedSampler(ratio) : new AlwaysOnSampler();
  }
}

/**
 * Construiește sampler-ul pentru `NodeSDK` (ParentBased + opțional forțare din baggage).
 */
export function buildTraceSampler(): Sampler {
  const effective = resolveEffectiveOtlpSamplerName();
  const root = buildInnerRootSampler(effective);
  const parentBased = new ParentBasedSampler({ root });
  return new BaggageForceSampleSampler(parentBased);
}
