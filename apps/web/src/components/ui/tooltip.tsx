import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs bg-[var(--color-s700)] text-[var(--color-t1)] shadow-[var(--shadow-md)] z-[var(--z-tooltip)] animate-[fadeIn_0.15s_ease-out]"
            sideOffset={5}
          >
            {content}
            <RadixTooltip.Arrow className="fill-[var(--color-s700)]" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
