import type { ConfigEnv, Plugin, PluginOption } from "vite";
import { describe, expect, it } from "vitest";
import webViteConfig from "../vite.config";

/** Vite permite Plugin | Plugin[] | Promise<Plugin> în lanțul de plugins. */
async function flattenPlugins(plugins: PluginOption[] | undefined): Promise<Plugin[]> {
  if (!plugins?.length) return [];
  const out: Plugin[] = [];
  for (const p of plugins) {
    if (p == null || p === false) continue;
    if (Array.isArray(p)) {
      out.push(...(await flattenPlugins(p)));
      continue;
    }
    if (typeof (p as PromiseLike<Plugin | Plugin[]>).then === "function") {
      const resolved = await (p as PromiseLike<Plugin | Plugin[]>);
      if (Array.isArray(resolved)) out.push(...(await flattenPlugins(resolved)));
      else out.push(resolved);
      continue;
    }
    out.push(p as Plugin);
  }
  return out;
}

function resolveWebConfig(env: ConfigEnv) {
  const raw = webViteConfig;
  if (typeof raw !== "function") {
    throw new TypeError("Expected apps/web vite.config to be a factory (command-based plugins)");
  }
  return raw(env);
}

describe("apps/web vite.config — Babel / React Compiler vs dev HMR", () => {
  it("nu include @rolldown/plugin-babel în serve (evită 500 pe /@vite/client și module virtuale)", async () => {
    const cfg = resolveWebConfig({ command: "serve", mode: "development" });
    const names = (await flattenPlugins(cfg.plugins)).map((p) => p.name ?? "");
    expect(names.filter((n) => n === "@rolldown/plugin-babel")).toHaveLength(0);
  });

  it("include @rolldown/plugin-babel la build (React Compiler pentru bundle-ul de producție)", async () => {
    const cfg = resolveWebConfig({ command: "build", mode: "production" });
    const names = (await flattenPlugins(cfg.plugins)).map((p) => p.name ?? "");
    expect(names.filter((n) => n === "@rolldown/plugin-babel")).toHaveLength(1);
  });
});
