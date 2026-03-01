import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils.js";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = "Selectează...",
  disabled,
  error,
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value ?? undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "sel w-full flex items-center justify-between gap-2",
          error && "border-[var(--color-er)]",
          className,
        )}
        aria-invalid={error}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[oklch(0.22_0.018_255/60%)] bg-[oklch(0.12_0.018_255/95%)] backdrop-blur-xl shadow-lg"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="relative flex cursor-default select-none items-center rounded-md py-2 pl-3 pr-8 text-sm outline-none data-[highlighted]:bg-[oklch(0.2_0.018_255)] data-[state=checked]:bg-[oklch(0.7_0.18_72/14%)]"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
                  ✓
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
