import type { Config } from "tailwindcss";

/**
 * Cognitive brain UI tokens. Canonical CSS variables live in `src/styles/globals.css` (:root).
 * Tailwind v4 also maps matching `--color-*` entries in `src/styles/tokens.css` (@theme).
 */
export default {
  theme: {
    extend: {
      colors: {
        "neuron-sensory": "var(--neuron-sensory)",
        "neuron-motor": "var(--neuron-motor)",
        "neuron-deliberative": "var(--neuron-deliberative)",
        "neuron-reflex": "var(--neuron-reflex)",
        "synapse-active": "var(--synapse-active)",
        "synapse-idle": "var(--synapse-idle)",
        "synapse-error": "var(--synapse-error)",
      },
    },
  },
} satisfies Config;
