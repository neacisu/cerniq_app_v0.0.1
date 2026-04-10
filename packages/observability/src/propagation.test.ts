import { describe, expect, it } from "vitest";
import { ROOT_CONTEXT, trace } from "@opentelemetry/api";
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from "@opentelemetry/core";
import { B3Propagator, B3InjectEncoding } from "@opentelemetry/propagator-b3";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";

function headerRecordGetter() {
  return {
    get(carrier: Record<string, string>, key: string): string | string[] | undefined {
      return carrier[key.toLowerCase()];
    },
    keys(carrier: Record<string, string>): string[] {
      return Object.keys(carrier);
    },
  };
}

describe("propagare W3C + B3 (CompositePropagator)", () => {
  it("extrage traceparent: context remote are același traceId", () => {
    const propagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    });
    const traceId = "0af7651916cd43dd8448eb211c80319c";
    const parentSpanId = "b7ad6b7169203331";
    const headers: Record<string, string> = {
      traceparent: `00-${traceId}-${parentSpanId}-01`,
    };
    const extracted = propagator.extract(ROOT_CONTEXT, headers, headerRecordGetter());
    const sc = trace.getSpanContext(extracted);
    expect(sc?.traceId).toBe(traceId);
    expect(sc?.spanId).toBe(parentSpanId);
  });

  it("ordine B3 apoi W3C: traceparent câștigă la trace-id față de x-b3-traceid divergent", () => {
    const w3cTrace = "0af7651916cd43dd8448eb211c80319c";
    const b3Trace = "11111111111111111111111111111111";
    const propagator = new CompositePropagator({
      propagators: [
        new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
        new W3CTraceContextPropagator(),
      ],
    });
    const headers: Record<string, string> = {
      traceparent: `00-${w3cTrace}-b7ad6b7169203331-01`,
      "x-b3-traceid": b3Trace,
      "x-b3-spanid": "2222222222222222",
      "x-b3-sampled": "1",
    };
    const extracted = propagator.extract(ROOT_CONTEXT, headers, headerRecordGetter());
    const sc = trace.getSpanContext(extracted);
    expect(sc?.traceId).toBe(w3cTrace);
  });

  it("span copil folosește traceId din context extras (părinte remote)", () => {
    trace.setGlobalTracerProvider(new BasicTracerProvider());
    const propagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    });
    const traceId = "0af7651916cd43dd8448eb211c80319c";
    const parentSpanId = "b7ad6b7169203331";
    const headers: Record<string, string> = {
      traceparent: `00-${traceId}-${parentSpanId}-01`,
    };
    const extracted = propagator.extract(ROOT_CONTEXT, headers, headerRecordGetter());
    const span = trace.getTracer("test").startSpan("http.child", {}, extracted);
    const child = span.spanContext();
    span.end();
    expect(child.traceId).toBe(traceId);
    expect(child.spanId).not.toBe(parentSpanId);
  });
});
