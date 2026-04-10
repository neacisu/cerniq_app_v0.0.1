import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import { fillLast7Days, type ViolationDayPoint } from "./guardrail-violations-chart-utils.js";

type Props = Readonly<{
  points: readonly ViolationDayPoint[];
  isLoading?: boolean;
}>;

export function GuardrailViolationsChart({ points, isLoading }: Props) {
  const data = fillLast7Days(points);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Violări guardrail (7 zile)</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <p className="text-sm text-t3 py-8">Se încarcă seria temporală…</p>
        ) : (
          <BarTrendChart data={data} />
        )}
      </CardBody>
    </Card>
  );
}
