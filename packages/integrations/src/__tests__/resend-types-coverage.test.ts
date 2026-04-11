import { describe, expect, it } from "vitest";

import { WARM_ALLOWED_STAGES } from "../resend/types.js";

describe("resend/types", () => {
  it("exportă etape permise pentru canal warm", () => {
    expect(WARM_ALLOWED_STAGES).toEqual(["WARM_REPLY", "NEGOTIATION"]);
  });
});
