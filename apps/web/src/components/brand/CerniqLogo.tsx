interface CerniqLogoProps {
  size?: number;
  iconOnly?: boolean;
}

export function CerniqLogo({ size = 32, iconOnly = false }: CerniqLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          fill="var(--color-b5)"
          fillOpacity="0.2"
          stroke="var(--color-b5)"
          strokeWidth="1.5"
        />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="var(--color-b5)"
          fontSize="12"
          fontWeight="700"
          fontFamily="var(--font-display)"
        >
          C
        </text>
      </svg>
      {!iconOnly && (
        <span
          className="text-lg font-bold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-t1)",
            letterSpacing: "-0.03em",
          }}
        >
          cerniq<span style={{ color: "var(--color-b5)" }}>.app</span>
        </span>
      )}
    </div>
  );
}
