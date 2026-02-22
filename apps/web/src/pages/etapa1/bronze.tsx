import { PageWrapper } from "@/components/layout/PageWrapper.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Input,
  SBadge,
} from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { MOCK_COMPANIES, COUNTIES } from "@/config/constants.js";

export function Bronze() {
  const avgQuality = Math.round(
    MOCK_COMPANIES.reduce((s, c) => s + c.quality, 0) / MOCK_COMPANIES.length,
  );

  return (
    <PageWrapper title="Bronze Contacte">
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-[var(--color-t3)]">Calitate Medie:</span>
        <span className="text-xl font-bold text-[var(--color-t1)]">
          {avgQuality}%
        </span>
      </div>

      <div className="flex gap-4 mb-6">
        <Input placeholder="Caută firmă sau CUI..." className="max-w-xs" />
        <select className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-s800)] border border-[var(--color-s600)] text-[var(--color-t1)] text-sm">
          <option value="">Toate județele</option>
          {COUNTIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacte Bronze</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)] text-left text-[var(--color-t3)]">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">CUI</th>
                <th className="px-5 py-3">County</th>
                <th className="px-5 py-3">Quality</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_COMPANIES.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--color-s700)] last:border-0 hover:bg-[var(--color-s800)]/50"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-t1)]">
                    {c.name}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-t2)]">{c.cui}</td>
                  <td className="px-5 py-3 text-[var(--color-t2)]">
                    {c.county}
                  </td>
                  <td className="px-5 py-3 w-32">
                    <ProgressBar value={c.quality} />
                  </td>
                  <td className="px-5 py-3">
                    <SBadge status={c.status} />
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
