/**
 * Coloane selectare bulk Gold — extrase din `gold.tsx` pentru a evita componente definite în useMemo (Sonar S6478).
 * Factory: `gold-select-column-def.tsx` (react-refresh: export doar componente aici).
 */

type GoldSelectColumnHeaderProps = {
  readonly allPageSelected: boolean;
  readonly onTogglePage: () => void;
};

export function GoldSelectColumnHeader({
  allPageSelected,
  onTogglePage,
}: Readonly<GoldSelectColumnHeaderProps>) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-s600"
      aria-label="Selectează toate pe pagină"
      checked={allPageSelected}
      onChange={onTogglePage}
    />
  );
}

type GoldSelectColumnCellProps = {
  readonly denumire: string;
  readonly checked: boolean;
  readonly onToggle: () => void;
};

export function GoldSelectColumnCell({
  denumire,
  checked,
  onToggle,
}: Readonly<GoldSelectColumnCellProps>) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-s600"
      aria-label={`Selectează ${denumire}`}
      checked={checked}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
