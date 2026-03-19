import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { cn } from "@/lib/utils.js";

const GUARD_TYPES = [
  { name: "Price Guard", status: "ok" as const },
  { name: "Stock Guard", status: "ok" as const },
  { name: "SKU Guard", status: "warning" as const },
  { name: "Fiscal Guard", status: "ok" as const },
];

const MOCK_AUDIT = [
  {
    time: "14:32:01",
    guard: "Price Guard",
    input: "Preț 150 RON",
    result: "PASS" as const,
    action: "Allowed",
  },
  {
    time: "14:31:58",
    guard: "Stock Guard",
    input: "SKU-123 x50",
    result: "BLOCKED" as const,
    action: "Rejected",
  },
  {
    time: "14:30:12",
    guard: "SKU Guard",
    input: "SKU-456",
    result: "PASS" as const,
    action: "Allowed",
  },
  {
    time: "14:28:45",
    guard: "Fiscal Guard",
    input: "CUI 12345678",
    result: "PASS" as const,
    action: "Allowed",
  },
  {
    time: "14:25:00",
    guard: "Price Guard",
    input: "Preț -10 RON",
    result: "BLOCKED" as const,
    action: "Rejected",
  },
];

export function Guardrails() {
  return (
    <PageWrapper title="Anti-hallucination Guardrails">
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        {GUARD_TYPES.map((g) => (
          <Card key={g.name} className="p-4">
            <div className="flex items-center gap-3">
              <StatusDot status={g.status} />
              <span className="font-medium text-t1">{g.name}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">Time</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Guard</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Input</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Result</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AUDIT.map((r) => (
                <tr
                  key={`${r.time}-${r.guard}-${r.input}`}
                  className="border-b border-s800 hover:bg-s800/50"
                >
                  <td className="px-4 py-3 text-t3">{r.time}</td>
                  <td className="px-4 py-3 text-t2">{r.guard}</td>
                  <td className="px-4 py-3 text-t1">{r.input}</td>
                  <td className="py-3 px-4">
                    <span
                      className={cn("font-semibold", r.result === "PASS" ? "text-ok" : "text-er")}
                    >
                      {r.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-t3">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
