import { describe, it, expect } from "vitest";
import { navigation } from "@/config/navigation";

describe("Navigation Config", () => {
  it("has 8 sections", () => {
    expect(navigation).toHaveLength(8);
  });
  it("has 36 total items", () => {
    const total = navigation.reduce((sum, s) => sum + s.items.length, 0);
    expect(total).toBe(36);
  });
  it("Cognitive Brain section exists with /brain path", () => {
    const cogSection = navigation.find((s) => s.title === "COGNITIVE BRAIN");
    expect(cogSection).toBeDefined();
    expect(cogSection?.items[0].path).toBe("/brain");
    expect(cogSection?.items[0].icon).toBe("Brain");
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
    const leads = navigation[2].items.find((i) => i.path === "/outreach/leads");
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
