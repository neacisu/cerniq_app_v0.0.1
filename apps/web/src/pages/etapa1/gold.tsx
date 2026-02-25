import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { MOCK_COMPANIES } from "@/config/constants.js";

const goldLeads = MOCK_COMPANIES.filter((c) => c.tier === "gold").map((c, i) => ({
  ...c,
  contact: ["Ion Popescu", "Maria Ionescu", "Adrian Niculescu"][i] ?? "Contact",
}));

export function Gold() {
  return (
    <PageWrapper title="Gold Leads" actions={<Button>Launch Outreach</Button>}>
      <Card>
        <CardHeader>
          <CardTitle>Leads Gold</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)] text-left text-[var(--color-t3)]">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">County</th>
                <th className="px-5 py-3">Revenue</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {goldLeads.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--color-s700)] last:border-0 hover:bg-[var(--color-s800)]/50"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-t1)]">{c.name}</td>
                  <td className="px-5 py-3 text-[var(--color-t2)]">{c.contact}</td>
                  <td className="px-5 py-3 text-[var(--color-t2)]">{c.county}</td>
                  <td className="px-5 py-3 text-[var(--color-t2)]">{c.revenue}</td>
                  <td className="px-5 py-3 w-28">
                    <ProgressBar value={c.score} />
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm">Send</Button>
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
