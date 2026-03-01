import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import type { BronzeContactRow, GoldCompanyRow, SilverCompanyRow } from "./etapa1-types.js";

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
    accessorKey: "cui",
    header: "CUI",
    cell: ({ row }) => row.original.cui ?? "-",
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
