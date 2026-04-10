import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, SBadge, TBadge } from "./badge.js";

const meta = {
  title: "Cerniq/UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  /** Necesar pentru tipul Storybook când `children` e obligatoriu pe `Badge`; story-urile cu `render` propriu ignoră afișarea implicită. */
  args: { children: " " },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variante: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="bronze">Bronze</Badge>
      <Badge variant="silver">Silver</Badge>
      <Badge variant="gold">Gold</Badge>
      <Badge variant="ok">OK</Badge>
      <Badge variant="warning">Atenție</Badge>
      <Badge variant="error">Eroare</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="neutral">Neutru</Badge>
      <Badge variant="brand">Brand</Badge>
    </div>
  ),
};

export const SBadgeStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <SBadge status="PROCESSING" />
      <SBadge status="FAILED" />
      <SBadge status="PENDING" />
      <SBadge status="WON" />
    </div>
  ),
};

export const TBadgeTier: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TBadge tier="bronze" />
      <TBadge tier="silver" />
      <TBadge tier="gold" />
    </div>
  ),
};
