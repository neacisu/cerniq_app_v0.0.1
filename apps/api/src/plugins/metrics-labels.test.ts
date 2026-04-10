import { describe, expect, it } from "vitest";
import { httpRequestSurface, httpRouteLabel } from "./metrics.js";

describe("httpRouteLabel + httpRequestSurface", () => {
  it("route din routeOptions.url", () => {
    const req = { url: "/api/v1/x/123", routeOptions: { url: "/api/v1/x/:id" } };
    expect(httpRouteLabel(req)).toBe("/api/v1/x/:id");
  });

  it("surface webhook dinșablon", () => {
    const req = {
      url: "/api/v1/webhooks/instantly",
      routeOptions: { url: "/api/v1/webhooks/instantly" },
    };
    expect(httpRequestSurface(req)).toBe("webhook");
  });

  it("surface api în rest", () => {
    const req = { url: "/api/v1/auth/login", routeOptions: { url: "/api/v1/auth/login" } };
    expect(httpRequestSurface(req)).toBe("api");
  });

  it("surface webhook din URL brut dacă route e unknown", () => {
    const req = { url: "/api/v1/webhooks/timelinesai?sig=1" };
    expect(httpRouteLabel(req)).toBe("unknown");
    expect(httpRequestSurface(req)).toBe("webhook");
  });
});
