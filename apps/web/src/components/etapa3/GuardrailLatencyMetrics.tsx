import type { ReactNode } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";

export type LatencyQueueRow = {
  workerQueue: string;
  p50: number;
  p95: number;
  p99: number;
  samples: number;
};

type Props = Readonly<{
  rows: readonly LatencyQueueRow[];
  windowDays: number;
  isLoading?: boolean;
}>;

function LatencyTable({ rows }: Readonly<{ rows: readonly LatencyQueueRow[] }>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-s700">
          <th className="px-4 py-3 text-left font-medium text-t3">Coadă worker (scanner)</th>
          <th className="px-4 py-3 text-right font-medium text-t3">P50 ms</th>
          <th className="px-4 py-3 text-right font-medium text-t3">P95 ms</th>
          <th className="px-4 py-3 text-right font-medium text-t3">P99 ms</th>
          <th className="px-4 py-3 text-right font-medium text-t3">N</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.workerQueue} className="border-b border-s800">
            <td className="px-4 py-3 font-mono text-xs text-t1">{r.workerQueue}</td>
            <td className="px-4 py-3 text-right font-mono text-t2">{r.p50}</td>
            <td className="px-4 py-3 text-right font-mono text-t2">{r.p95}</td>
            <td className="px-4 py-3 text-right font-mono text-t2">{r.p99}</td>
            <td className="px-4 py-3 text-right text-t3">{r.samples}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function GuardrailLatencyMetrics({ rows, windowDays, isLoading }: Props) {
  let body: ReactNode;
  if (isLoading === true) {
    body = <p className="text-sm text-t3 px-4 py-6">Se încarcă…</p>;
  } else if (rows.length === 0) {
    body = (
      <p className="text-sm text-t3 px-4 py-6">
        Nu există eșantion audit LLM în fereastra selectată.
      </p>
    );
  } else {
    body = <LatencyTable rows={rows} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latency LLM Guard (P50 / P95 / P99) — ultimele {windowDays} zile</CardTitle>
      </CardHeader>
      <CardBody className="p-0 overflow-x-auto">{body}</CardBody>
    </Card>
  );
}
