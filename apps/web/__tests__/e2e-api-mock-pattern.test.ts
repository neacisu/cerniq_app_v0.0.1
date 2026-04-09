import { describe, it, expect } from "vitest";
import { E2E_API_MOCK_OUTREACH_SEQUENCE_PATH } from "../e2e/fixtures/api-mock";

describe("E2E API mock — potrivire căi", () => {
  it("extrage id-ul secvenței din path-ul GET detaliu", () => {
    const m = E2E_API_MOCK_OUTREACH_SEQUENCE_PATH.exec(
      "/api/v1/outreach/sequences/88888888-8888-4888-8888-888888888888",
    );
    expect(m?.[1]).toBe("88888888-8888-4888-8888-888888888888");
  });

  it("nu potrivește path-uri cu segmente suplimentare", () => {
    expect(
      E2E_API_MOCK_OUTREACH_SEQUENCE_PATH.exec("/api/v1/outreach/sequences/abc/extra"),
    ).toBeNull();
  });
});
