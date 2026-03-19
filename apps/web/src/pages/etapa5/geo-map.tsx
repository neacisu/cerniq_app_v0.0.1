import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBanner } from "@/components/brand/EtapaBadge.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";
import { toast } from "sonner";

const topCounties = [
  { label: "Timiș", value: 342 },
  { label: "Cluj", value: 298 },
  { label: "Iași", value: 256 },
  { label: "Constanța", value: 234 },
];

const mapPoints = [
  { x: 25, y: 30, r: 20, density: 1 },
  { x: 60, y: 25, r: 28, density: 2 },
  { x: 45, y: 55, r: 16, density: 3 },
  { x: 75, y: 70, r: 24, density: 4 },
  { x: 30, y: 75, r: 12, density: 5 },
];

const maxCountyValue = Math.max(...topCounties.map((county) => county.value), 1);

export function GeoMap() {
  return (
    <PageWrapper title="Geographic Map">
      <EtapaBanner
        title="PostGIS Geographic Distribution"
        description="Click on regions for details"
        type="ok"
        className="mb-6"
      />

      <div className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Map</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="relative h-80 bg-s800 rounded-md">
                {mapPoints.map((p) => (
                  <button
                    key={`${p.x}-${p.y}-${p.density}`}
                    type="button"
                    onClick={() => toast.info(`Region density: ${p.density}`)}
                    className="absolute rounded-full bg-b5/60 hover:bg-b5/80 transition-colors cursor-pointer"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: p.r,
                      height: p.r,
                      transform: "translate(-50%, -50%)",
                      boxShadow: `0 0 ${p.r}px var(--color-b5)`,
                    }}
                  />
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Counties</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {topCounties.map((c) => {
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => toast.info(`${c.label}: ${c.value} clients`)}
                      className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <span className="text-xs text-t3 w-24 truncate">{c.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-s700 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.value / maxCountyValue) * 100}%`,
                            background: "var(--color-b5)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-t2 min-w-8 text-right">
                        {c.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <div
            className={cn(
              "border-2 border-dashed border-s600 rounded-md p-4 text-center text-sm text-t3",
            )}
          >
            Potential neexplorat
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
