import type { LeadState } from "@/lib/etapa2-api";

/**
 * Config vizuală pentru stările lead journey (ADR-0062).
 * Separat de `StageBadge.tsx` pentru react-refresh/only-export-components.
 */
export const STAGE_CONFIG: Record<LeadState, { label: string; className: string; icon: string }> = {
  COLD: { label: "Rece", className: "bg-slate-700 text-slate-200 border-slate-600", icon: "❄" },
  CONTACTED_WA: {
    label: "Contactat WA",
    className: "bg-blue-900/60 text-blue-300 border-blue-700",
    icon: "💬",
  },
  CONTACTED_EMAIL: {
    label: "Contactat Email",
    className: "bg-indigo-900/60 text-indigo-300 border-indigo-700",
    icon: "✉",
  },
  WARM_REPLY: {
    label: "Răspuns Cald",
    className: "bg-green-900/60 text-green-300 border-green-700",
    icon: "🔥",
  },
  NEGOTIATION: {
    label: "Negociere",
    className: "bg-amber-900/60 text-amber-300 border-amber-700",
    icon: "🤝",
  },
  CONVERTED: {
    label: "Convertit",
    className: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    icon: "✅",
  },
  DEAD: { label: "Inactiv", className: "bg-red-900/60 text-red-300 border-red-700", icon: "✗" },
  PAUSED: { label: "Pauză", className: "bg-gray-800 text-gray-400 border-gray-600", icon: "⏸" },
} as const;
