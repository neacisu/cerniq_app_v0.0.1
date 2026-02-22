import { describe, it, expect } from "vitest";
import { navigation } from "@/config/navigation";

describe("Navigation Config", () => {
  it("has 7 sections", () => {
    expect(navigation).toHaveLength(7);
  });
  it("has 27 total items", () => {
    const total = navigation.reduce((sum, s) => sum + s.items.length, 0);
    expect(total).toBe(27);
  });
  it("Dashboard is first item", () => {
    expect(navigation[0].items[0].path).toBe("/dashboard");
  });
  it("Approvals has danger badge", () => {
    const approvals = navigation[1].items.find((i) => i.path === "/approvals");
    expect(approvals?.badge?.type).toBe("danger");
    expect(approvals?.badge?.count).toBe(3);
  });
  it("Leads has warning badge", () => {
    const leads = navigation[2].items.find((i) => i.path === "/leads");
    expect(leads?.badge?.type).toBe("warning");
    expect(leads?.badge?.count).toBe(127);
  });
  it("all items have icon", () => {
    navigation.forEach((section) =>
      section.items.forEach((item) => expect(item.icon).toBeTruthy()),
    );
  });
  it("all items have unique paths", () => {
    const paths = navigation.flatMap((s) => s.items.map((i) => i.path));
    expect(new Set(paths).size).toBe(paths.length);
  });
});
