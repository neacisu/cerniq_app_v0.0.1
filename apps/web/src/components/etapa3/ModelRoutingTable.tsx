import type { ReactNode } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";

export type ModelRouteRow = {
  workerQueue: string;
  modelUsed: string;
  count: number;
};

type Props = Readonly<{
  rows: readonly ModelRouteRow[];
  windowDays: number;
  isLoading?: boolean;
}>;

function RoutingTable({ rows }: Readonly<{ rows: readonly ModelRouteRow[] }>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-s700">
          <th className="px-4 py-3 text-left font-medium text-t3">Task (worker queue)</th>
          <th className="px-4 py-3 text-left font-medium text-t3">Model</th>
          <th className="px-4 py-3 text-right font-medium text-t3">Apeluri</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.workerQueue}-${r.modelUsed}-${i}`} className="border-b border-s800">
            <td className="px-4 py-3 font-mono text-xs text-t1 max-w-[220px] truncate">
              {r.workerQueue}
            </td>
            <td className="px-4 py-3 font-mono text-xs text-b5">{r.modelUsed}</td>
            <td className="px-4 py-3 text-right text-t2">{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ModelRoutingTable({ rows, windowDays, isLoading }: Props) {
  let main: ReactNode;
  if (isLoading === true) {
    main = <p className="text-sm text-t3 px-4 py-6">Se încarcă…</p>;
  } else if (rows.length === 0) {
    main = <p className="text-sm text-t3 px-4 py-6">Nu există rute în fereastra selectată.</p>;
  } else {
    main = <RoutingTable rows={rows} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model routing (coadă → model)</CardTitle>
      </CardHeader>
      <CardBody className="p-0 overflow-x-auto">
        {main}
        <p className="text-xs text-t4 px-4 py-3">
          Ultimele {windowDays} zile — sursă audit.audit_llm_calls.
        </p>
      </CardBody>
    </Card>
  );
}
