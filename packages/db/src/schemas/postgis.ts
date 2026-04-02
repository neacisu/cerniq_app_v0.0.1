import { customType } from "drizzle-orm/pg-core";

export const geographyPoint = customType<{ data: string | null; driverData: string | null }>({
  dataType() {
    return "geography(POINT,4326)";
  },
});

export const geometryPolygon = customType<{ data: string | null; driverData: string | null }>({
  dataType() {
    return "geometry(POLYGON,4326)";
  },
});
