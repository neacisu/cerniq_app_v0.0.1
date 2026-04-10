// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CookieConsentBanner } from "./CookieConsentBanner.js";

const meta = {
  title: "Cerniq/gdpr/CookieConsentBanner",
  component: CookieConsentBanner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof CookieConsentBanner>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof CookieConsentBanner>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <CookieConsentBanner {...args} />,
} as unknown as Story;
