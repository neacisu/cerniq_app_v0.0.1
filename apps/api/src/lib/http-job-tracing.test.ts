import { describe, it, expect } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  buildHttpJobTracingFields,
  buildApiJobPayloadContext,
  getFirstNonEmptyCorrelationIdHeader,
  hashClientIp,
} from "./http-job-tracing.js";

/** Fastify 5: `routeOptions` e `Readonly<RequestRouteOptions<…>>`; în teste ne trebuie doar pattern-ul `url`. */
function mockRouteOptions(url: string): FastifyRequest["routeOptions"] {
  return { url } as FastifyRequest["routeOptions"];
}

function partialReq(overrides: Record<string, unknown>): FastifyRequest {
  return overrides as unknown as FastifyRequest;
}

describe("http-job-tracing", () => {
  describe("getFirstNonEmptyCorrelationIdHeader", () => {
    it("sare primul element gol din array (proxy duplicat)", () => {
      expect(
        getFirstNonEmptyCorrelationIdHeader(
          partialReq({ headers: { "x-correlation-id": ["", "  real "] } }),
        ),
      ).toBe("real");
    });
  });

  describe("hashClientIp", () => {
    it("returnează string gol când ip lipsește", () => {
      expect(hashClientIp(partialReq({ ip: "" }))).toBe("");
    });

    it("hash consistent pentru același ip", () => {
      const r = partialReq({ ip: "203.0.113.5" });
      const a = hashClientIp(r);
      const b = hashClientIp(r);
      expect(a.length).toBe(16);
      expect(a).toBe(b);
    });
  });

  describe("buildHttpJobTracingFields", () => {
    it("folosește header string x-correlation-id", () => {
      const r = partialReq({
        id: "req-1",
        url: "/x",
        routeOptions: mockRouteOptions("/r/:id"),
        headers: { "x-correlation-id": "  abc-123  " },
        user: { id: "u1" },
      });
      expect(buildHttpJobTracingFields(r, () => "fixed")).toEqual({
        requestId: "req-1",
        httpCorrelationId: "abc-123",
        sourceEndpoint: "/r/:id",
        actorId: "u1",
      });
    });

    it("folosește primul element non-gol din array header", () => {
      const r = partialReq({
        id: "req-2",
        url: "/raw",
        headers: { "x-correlation-id": ["", "  first ", "second"] },
      });
      expect(buildHttpJobTracingFields(r, () => "uuid-mock")).toEqual({
        requestId: "req-2",
        httpCorrelationId: "first",
        sourceEndpoint: "/raw",
      });
    });

    it("generează UUID când header lipsește", () => {
      const r = partialReq({
        id: "req-3",
        url: "/only",
        routeOptions: mockRouteOptions("/pattern"),
        headers: {},
      });
      expect(buildHttpJobTracingFields(r, () => "00000000-0000-4000-8000-000000000001")).toEqual({
        requestId: "req-3",
        httpCorrelationId: "00000000-0000-4000-8000-000000000001",
        sourceEndpoint: "/pattern",
      });
    });

    it("actorId din userId apoi sub", () => {
      expect(
        buildHttpJobTracingFields(
          partialReq({
            id: "i",
            url: "/",
            headers: {},
            user: { userId: "from-userId" },
          }),
          () => "u",
        ).actorId,
      ).toBe("from-userId");
      expect(
        buildHttpJobTracingFields(
          partialReq({
            id: "i",
            url: "/",
            headers: {},
            user: { sub: "from-sub" },
          }),
          () => "u",
        ).actorId,
      ).toBe("from-sub");
    });
  });

  describe("buildApiJobPayloadContext", () => {
    it("combină provenance cu tracing HTTP", () => {
      const r = partialReq({
        id: "rid",
        url: "/api/x",
        routeOptions: mockRouteOptions("/api/x"),
        headers: {
          "x-correlation-id": "corr-1",
          traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
        },
        user: { id: "actor" },
      });
      const ctx = buildApiJobPayloadContext(r);
      expect(ctx.requestId).toBe("rid");
      expect(ctx.httpCorrelationId).toBe("corr-1");
      expect(ctx.causationKey).toBe("rid");
      expect(ctx.traceId).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      expect(ctx.actorId).toBe("actor");
      expect(ctx.sourceEndpoint).toBe("/api/x");
    });
  });
});
