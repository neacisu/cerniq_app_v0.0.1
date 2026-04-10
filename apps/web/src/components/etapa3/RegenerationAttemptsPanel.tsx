import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";

type Props = Readonly<{
  totalAttempts: string;
  callsWithRegeneration: number;
  windowDays: number;
}>;

export function RegenerationAttemptsPanel({
  totalAttempts,
  callsWithRegeneration,
  windowDays,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regenerări răspuns (LLM)</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-t3">Încercări cumulative (regeneration_attempt)</span>
          <span className="font-mono font-semibold text-t1">{totalAttempts}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-t3">Apeluri cu ≥1 regenerare</span>
          <span className="font-mono font-semibold text-b5">{callsWithRegeneration}</span>
        </div>
        <p className="text-xs text-t4 mt-2">Fereastră: ultimele {windowDays} zile (audit LLM).</p>
      </CardBody>
    </Card>
  );
}
