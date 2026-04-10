import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import "../src/index.css";
import { storybookDefaultHandlers } from "./msw-handlers";
import {
  createConditionalAppShellDecorator,
  withAppShell,
  withStorybookProvidersOnly,
} from "./decorators";

initialize({ onUnhandledRequest: "bypass" }, storybookDefaultHandlers);

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "cerniq-dark",
      values: [
        { name: "cerniq-dark", value: "oklch(0.09 0.015 255)" },
        { name: "surface-raised", value: "oklch(0.12 0.018 255)" },
      ],
    },
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: false }],
      },
    },
    docs: {
      toc: true,
    },
    msw: {
      handlers: storybookDefaultHandlers,
    },
  },
  decorators: [createConditionalAppShellDecorator(withAppShell, withStorybookProvidersOnly)],
  tags: ["autodocs"],
};

export default preview;
