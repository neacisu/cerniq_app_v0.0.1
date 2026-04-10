import { describe, it, expect } from "vitest";
import { parseGeoRowCoords } from "@/components/etapa5/cluster-map-chart-utils.js";

describe("parseGeoRowCoords", () => {
  it("acceptă coordonate valide din stringuri API", () => {
    expect(
      parseGeoRowCoords({
        regionLabel: "RO-AB",
        companyCount: 3,
        revenueSum: "0",
        avgLatitude: "46.0",
        avgLongitude: "23.5",
      }),
    ).toEqual({ lat: 46, lng: 23.5 });
  });

  it("respinge null / NaN", () => {
    expect(
      parseGeoRowCoords({
        regionLabel: "X",
        companyCount: 1,
        revenueSum: "0",
        avgLatitude: null,
        avgLongitude: null,
      }),
    ).toBeNull();
  });
});
