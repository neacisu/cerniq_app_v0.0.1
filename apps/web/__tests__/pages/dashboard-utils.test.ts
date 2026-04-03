import { describe, it, expect } from "vitest";
import { queryErrorMessage, queryErrorDetail, getActivityStatus } from "@/pages/dashboard/utils.js";

describe("dashboard utils", () => {
  describe("queryErrorMessage", () => {
    it("returnează mesajul din Error", () => {
      expect(queryErrorMessage(new Error("timeout"))).toBe("timeout");
    });
    it("returnează fallback pentru non-Error", () => {
      expect(queryErrorMessage(undefined)).toBe("Eroare API");
      expect(queryErrorMessage("string")).toBe("Eroare API");
    });
  });

  describe("queryErrorDetail", () => {
    it("folosește fallback-ul custom", () => {
      expect(queryErrorDetail(null, "eroare API")).toBe("eroare API");
      expect(queryErrorDetail(undefined, "Eroare contracte")).toBe("Eroare contracte");
    });

    it("returnează mesajul pentru Error", () => {
      expect(queryErrorDetail(new Error("timeout"), "fallback")).toBe("timeout");
    });
  });

  describe("getActivityStatus", () => {
    it("mapează severitate critică la error", () => {
      expect(
        getActivityStatus({
          id: "1",
          type: "pipeline_error",
          timestamp: new Date().toISOString(),
          message: "x",
          severity: "critical",
        }),
      ).toBe("error");
    });
    it("mapează approval la warning", () => {
      expect(
        getActivityStatus({
          id: "2",
          type: "approval_xyz",
          timestamp: new Date().toISOString(),
          message: "y",
          severity: null,
        }),
      ).toBe("warning");
    });
  });
});
