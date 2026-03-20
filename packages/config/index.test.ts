import { describe, expect, it } from "vitest";
import { CONFIG_PACKAGE } from "./index";

describe("@cerniq/config", () => {
  it("exports the package identifier", () => {
    expect(CONFIG_PACKAGE).toBe("@cerniq/config");
  });
});
