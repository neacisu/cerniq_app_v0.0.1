import path from "node:path";

/**
 * Mapare Rollup `moduleId` → nume chunk pentru build-ul SPA (cache pe straturi: vendor / refine / UI).
 * Folosit exclusiv din `vite.config.ts` (`build.rollupOptions.output.manualChunks`).
 */
export function manualChunkForModuleId(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  const sep = path.sep;
  if (
    id.includes(`${sep}react${sep}`) ||
    id.includes(`${sep}react-dom${sep}`) ||
    id.includes("react-router-dom")
  ) {
    return "vendor";
  }
  if (id.includes("@refinedev/core")) return "refine";
  if (id.includes("lucide-react") || id.includes(`${sep}sonner${sep}`) || id.includes("recharts")) {
    return "ui";
  }
  return undefined;
}
