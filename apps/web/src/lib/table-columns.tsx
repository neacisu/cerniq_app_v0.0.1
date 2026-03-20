import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import type { BronzeContactRow, GoldCompanyRow, SilverCompanyRow } from "./etapa1-types.js";

export function makeBronzeContactsColumns(
  onOpen: (id: string) => void,
): ColumnDef<BronzeContactRow>[] {
  return [
    {
      accessorKey: "extractedName",
      header: "Nume",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left text-b5 underline-offset-2 hover:underline"
          onClick={() => onOpen(String(row.original.id))}
        >
          {row.original.extractedName ?? "-"}
        </button>
      ),
    },
    ...bronzeContactsColumns.slice(1),
  ];
}

export const bronzeContactsColumns: ColumnDef<BronzeContactRow>[] = [
  {
    accessorKey: "extractedName",
    header: "Nume",
    cell: ({ row }) => row.original.extractedName ?? "-",
  },
  {
    accessorKey: "extractedCui",
    header: "CUI",
    cell: ({ row }) => row.original.extractedCui ?? "-",
  },
  {
    accessorKey: "sourceType",
    header: "Sursa",
  },
  {
    accessorKey: "processingStatus",
    header: "Status",
    cell: ({ row }) => <Badge variant="info">{String(row.original.processingStatus)}</Badge>,
  },
];

export const silverCompaniesColumns: ColumnDef<SilverCompanyRow>[] = [
  {
    accessorKey: "denumire",
    header: "Companie",
    cell: ({ row }) => row.original.denumire ?? "-",
  },
  {
    id: "cui",
    header: "CUI / Nr. Reg.",
    cell: ({ row }) => (
      <div className="flex flex-col leading-tight">
        <span>{row.original.cui ?? <span className="text-t3">—</span>}</span>
        {row.original.nrRegCom && <span className="text-xs text-t3">{row.original.nrRegCom}</span>}
      </div>
    ),
  },
  {
    accessorKey: "enrichmentStatus",
    header: "Enrichment",
    cell: ({ row }) => <Badge variant="warning">{String(row.original.enrichmentStatus)}</Badge>,
  },
  {
    accessorKey: "promotionStatus",
    header: "Promotion",
    cell: ({ row }) => <Badge variant="brand">{String(row.original.promotionStatus)}</Badge>,
  },
  {
    accessorKey: "totalQualityScore",
    header: "Quality",
    cell: ({ row }) => <ProgressBar value={Number(row.original.totalQualityScore ?? 0)} />,
  },
];

export function makeSilverCompaniesColumns(
  onOpen: (id: string) => void,
): ColumnDef<SilverCompanyRow>[] {
  return [
    {
      accessorKey: "denumire",
      header: "Companie",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left text-b5 underline-offset-2 hover:underline"
          onClick={() => onOpen(String(row.original.id))}
        >
          {row.original.denumire ?? "-"}
        </button>
      ),
    },
    ...silverCompaniesColumns.slice(1),
  ];
}

export const goldCompaniesColumns: ColumnDef<GoldCompanyRow>[] = [
  {
    accessorKey: "denumire",
    header: "Companie",
    cell: ({ row }) => row.original.denumire ?? "-",
  },
  {
    accessorKey: "currentState",
    header: "State",
    cell: ({ row }) => <Badge variant="gold">{String(row.original.currentState)}</Badge>,
  },
  {
    accessorKey: "judetCod",
    header: "Judet",
    cell: ({ row }) => row.original.judetCod ?? "-",
  },
  {
    accessorKey: "cifraAfaceri",
    header: "Cifra afaceri",
    cell: ({ row }) => row.original.cifraAfaceri ?? "-",
  },
  {
    accessorKey: "leadScore",
    header: "Lead score",
    cell: ({ row }) => <ProgressBar value={Number(row.original.leadScore ?? 0)} />,
  },
];

export function makeGoldCompaniesColumns(
  onOpen: (id: string) => void,
): ColumnDef<GoldCompanyRow>[] {
  return [
    {
      accessorKey: "denumire",
      header: "Companie",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left text-b5 underline-offset-2 hover:underline"
          onClick={() => onOpen(String(row.original.id))}
        >
          {row.original.denumire ?? "-"}
        </button>
      ),
    },
    ...goldCompaniesColumns.slice(1),
  ];
}
