import { describe, it, expect } from "vitest";
import { navigation } from "@/config/navigation";
import { getNavigationForRole } from "@/config/navigation-helpers";
import { resolveEffectiveSessionId } from "@/components/etapa1/pipeline-session.js";

describe("Navigation Config", () => {
  it("has 8 sections", () => {
    expect(navigation).toHaveLength(8);
  });
  it("has expected total nav items (incl. Dashboard E1)", () => {
    const total = navigation.reduce((sum, s) => sum + s.items.length, 0);
    expect(total).toBe(45);
  });
  it("Cognitive Brain section exists with /brain path", () => {
    const cogSection = navigation.find((s) => s.title === "COGNITIVE BRAIN");
    expect(cogSection).toBeDefined();
    expect(cogSection?.items[0].path).toBe("/brain");
    expect(cogSection?.items[0].icon).toBe("Brain");
  });
  it("Dashboard general is first item", () => {
    expect(navigation[0].items[0].path).toBe("/dashboard");
    expect(navigation[0].items[0].label).toBe("Dashboard general");
  });
  it("Dashboard E1 is first item in Etapa 1 section", () => {
    const e1 = navigation[1];
    expect(e1.title).toContain("ETAPA 1");
    expect(e1.items[0].path).toBe("/etapa1/dashboard");
    expect(e1.items[0].label).toBe("Dashboard E1");
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

describe("getNavigationForRole", () => {
  it("hides admin-only routes for viewer", () => {
    const nav = getNavigationForRole("viewer");
    const paths = nav.flatMap((s) => s.items.map((i) => i.path));
    expect(paths).not.toContain("/workers");
  });

  it("shows workers for admin", () => {
    const nav = getNavigationForRole("admin");
    const paths = nav.flatMap((s) => s.items.map((i) => i.path));
    expect(paths).toContain("/workers");
  });
});

describe("resolveEffectiveSessionId", () => {
  it("falls back to the runtime-selected session when the user did not pick one", () => {
    expect(resolveEffectiveSessionId("batch-1", {}, "session-default")).toBe("session-default");
  });

  it("prefers the user-selected attempt for the current batch", () => {
    expect(
      resolveEffectiveSessionId(
        "batch-1",
        {
          "batch-1": "session-user",
          "batch-2": "session-other",
        },
        "session-default",
      ),
    ).toBe("session-user");
  });

  it("keeps selections isolated per batch", () => {
    expect(
      resolveEffectiveSessionId("batch-2", { "batch-1": "session-user" }, "session-default"),
    ).toBe("session-default");
  });
});
