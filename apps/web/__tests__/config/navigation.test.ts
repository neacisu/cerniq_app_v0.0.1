import { describe, it, expect } from "vitest";
import { navigation } from "@/config/navigation";

describe("Navigation Config", () => {
  it("has 7 sections", () => {
    expect(navigation).toHaveLength(7);
  });
  it("has 32 total items", () => {
    const total = navigation.reduce((sum, s) => sum + s.items.length, 0);
    expect(total).toBe(32);
  });
  it("Dashboard is first item", () => {
    expect(navigation[0].items[0].path).toBe("/dashboard");
  });
  it("Approvals HITL exists in Etapa 1 navigation", () => {
    const approvals = navigation[1].items.find((i) => i.path === "/approvals");
    expect(approvals?.label).toBe("Approvals HITL");
    expect(approvals?.icon).toBe("ClipboardList");
  });
  it("Leads exists in Etapa 2 navigation", () => {
    const leads = navigation[2].items.find((i) => i.path === "/leads");
    expect(leads?.label).toBe("Leads");
    expect(leads?.icon).toBe("Users");
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
