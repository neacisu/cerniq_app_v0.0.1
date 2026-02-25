import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardHeader, CardTitle, CardBody, TBadge } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { MOCK_COMPANIES } from "@/config/constants.js";

const silverCompanies = MOCK_COMPANIES.filter((c) => c.tier === "silver" || c.tier === "gold");

export function Silver() {
  return (
    <PageWrapper
      title="Silver Companies"
      actions={
        <>
          <Button variant="outline">Sync ANAF</Button>
          <Button>Promote to Gold</Button>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Companii Validate</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)] text-left text-[var(--color-t3)]">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">CUI</th>
                <th className="px-5 py-3">ANAF</th>
                <th className="px-5 py-3">Termene</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Tier</th>
              </tr>
            </thead>
            <tbody>
              {silverCompanies.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--color-s700)] last:border-0 hover:bg-[var(--color-s800)]/50"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-t1)]">{c.name}</td>
                  <td className="px-5 py-3 text-[var(--color-t2)]">{c.cui}</td>
                  <td className="px-5 py-3">{c.anafValid ? "✓" : "✗"}</td>
                  <td className="px-5 py-3">{c.termeneValid ? "✓" : "✗"}</td>
                  <td className="px-5 py-3 w-28">
                    <ProgressBar value={c.score} />
                  </td>
                  <td className="px-5 py-3">
                    <TBadge tier={c.tier as "bronze" | "silver" | "gold"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
