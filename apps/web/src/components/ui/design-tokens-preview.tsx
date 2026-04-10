/**
 * Preview token-uri CSS (dev). Ruta: `/settings/design-system` când `import.meta.env.DEV`.
 */
import { PageWrapper } from "@/components/layout/PageWrapper.js";

const SEMANTIC_SWATCHES: { label: string; varName: string }[] = [
  { label: "Primary", varName: "--color-primary" },
  { label: "Primary hover", varName: "--color-primary-hover" },
  { label: "Surface base", varName: "--color-surface-base" },
  { label: "Surface raised", varName: "--color-surface-raised" },
  { label: "Surface overlay", varName: "--color-surface-overlay" },
  { label: "Border subtle", varName: "--color-border-subtle" },
  { label: "Border default", varName: "--color-border-default" },
  { label: "Focus ring", varName: "--color-focus-ring" },
];

const CHART_SWATCHES = Array.from({ length: 8 }, (_, i) => ({
  label: `Chart ${i + 1}`,
  varName: `--color-chart-${i + 1}`,
}));

const BRAND_SURFACES: { label: string; varName: string }[] = [
  { label: "b3", varName: "--color-b3" },
  { label: "b4", varName: "--color-b4" },
  { label: "b5", varName: "--color-b5" },
  { label: "b6", varName: "--color-b6" },
  { label: "s950", varName: "--color-s950" },
  { label: "s900", varName: "--color-s900" },
  { label: "s800", varName: "--color-s800" },
  { label: "s700", varName: "--color-s700" },
  { label: "s600", varName: "--color-s600" },
];

function Swatch({ label, varName }: Readonly<{ label: string; varName: string }>) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div
        className="h-12 w-full rounded-md border border-s600 shadow-sm"
        style={{ background: `var(${varName})` }}
        title={varName}
      />
      <span className="text-[10px] text-t3 truncate">{label}</span>
      <code className="text-[9px] text-t4 font-mono truncate">{varName}</code>
    </div>
  );
}

export function DesignTokensPreviewPage() {
  return (
    <PageWrapper title="Design tokens" subtitle="Dark Terroir — preview OKLCH (dev)">
      <div className="space-y-10 pb-12">
        <section>
          <h2 className="text-sm font-semibold text-t1 mb-3">Brand & suprafețe</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {BRAND_SURFACES.map((s) => (
              <Swatch key={s.varName} label={s.label} varName={s.varName} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-t1 mb-3">Alias-uri semantice</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SEMANTIC_SWATCHES.map((s) => (
              <Swatch key={s.varName} label={s.label} varName={s.varName} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-t1 mb-3">Paletă chart (P3)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
            {CHART_SWATCHES.map((s) => (
              <Swatch key={s.varName} label={s.label} varName={s.varName} />
            ))}
          </div>
        </section>
        <p className="text-xs text-t4 max-w-prose">
          Documentație: <code className="text-t3">apps/web/src/styles/design-system.md</code>. Nu
          modificați token-urile de bază fără revizuire contrast (WCAG AA).
        </p>
      </div>
    </PageWrapper>
  );
}
