import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-links",
    "@storybook/addon-onboarding",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(cfg) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(cfg, {
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "../src"),
        },
      },
      plugins: [tailwindcss()],
      optimizeDeps: {
        include: ["@xyflow/react", "recharts", "lucide-react"],
      },
    });
  },
};

export default config;
