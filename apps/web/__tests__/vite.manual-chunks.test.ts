import path from "node:path";
import { describe, expect, it } from "vitest";
import { manualChunkForModuleId } from "../vite.manual-chunks";

describe("manualChunkForModuleId", () => {
  it("returnează undefined pentru cod sursă din proiect (fără node_modules)", () => {
    expect(manualChunkForModuleId("/repo/apps/web/src/main.tsx")).toBeUndefined();
  });

  it("grupează React / react-dom / react-router-dom în vendor", () => {
    const sep = path.sep;
    expect(
      manualChunkForModuleId(`/repo/node_modules${sep}react${sep}cjs${sep}react.production.js`),
    ).toBe("vendor");
    expect(
      manualChunkForModuleId(
        `/repo/node_modules${sep}react-dom${sep}cjs${sep}react-dom.production.js`,
      ),
    ).toBe("vendor");
    expect(manualChunkForModuleId("/repo/node_modules/react-router-dom/dist/index.js")).toBe(
      "vendor",
    );
  });

  it("grupează @refinedev/core în refine", () => {
    expect(manualChunkForModuleId("/repo/node_modules/@refinedev/core/dist/index.js")).toBe(
      "refine",
    );
  });

  it("grupează lucide-react, sonner și recharts în ui", () => {
    const sep = path.sep;
    expect(manualChunkForModuleId("/repo/node_modules/lucide-react/dist/esm/icons/foo.js")).toBe(
      "ui",
    );
    expect(manualChunkForModuleId(`/repo/node_modules${sep}sonner${sep}dist/index.js`)).toBe("ui");
    expect(manualChunkForModuleId("/repo/node_modules/recharts/es6/chart/LineChart.js")).toBe("ui");
  });

  it("nu atribuie chunk pentru alte pachete din node_modules (lazy / default)", () => {
    expect(manualChunkForModuleId("/repo/node_modules/some-lib/index.js")).toBeUndefined();
  });
});
