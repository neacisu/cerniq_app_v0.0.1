/**
 * Factory coloană selectare (non-component) — separat de componente pentru react-refresh/only-export-components.
 */
import type { CellContext, ColumnDef } from "@tanstack/react-table";
import type { GoldCompanyRow } from "@/lib/etapa1-types.js";
import { GoldSelectColumnCell, GoldSelectColumnHeader } from "@/pages/etapa1/gold-select-column.js";

export function buildGoldSelectColumnDef(
  allPageSelected: boolean,
  onTogglePage: () => void,
  selectedIds: Set<string>,
  toggleRow: (id: string) => void,
): ColumnDef<GoldCompanyRow> {
  return {
    id: "select",
    header() {
      return (
        <GoldSelectColumnHeader allPageSelected={allPageSelected} onTogglePage={onTogglePage} />
      );
    },
    cell({ row }: CellContext<GoldCompanyRow, unknown>) {
      return (
        <GoldSelectColumnCell
          denumire={row.original.denumire ?? ""}
          checked={selectedIds.has(row.original.id)}
          onToggle={() => toggleRow(row.original.id)}
        />
      );
    },
    size: 40,
  };
}
