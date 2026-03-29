import { customType } from "drizzle-orm/pg-core";

export function halfvec(name: string, config: { dimensions: number }) {
  return customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `halfvec(${config.dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(",")}]`;
    },
    fromDriver(value: string): number[] {
      return value.replace(/^\[/, "").replace(/]$/, "").split(",").map(Number);
    },
  })(name);
}
