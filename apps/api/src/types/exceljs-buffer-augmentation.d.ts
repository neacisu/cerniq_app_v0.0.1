/**
 * Augmentation for ExcelJS 4.4.0 to support Node.js 22+ generic Buffer<T>.
 *
 * ExcelJS 4.4.0 declares Xlsx.load(buffer: Buffer) using the legacy non-generic
 * Buffer type. Node.js ≥22 / @types/node ≥25 introduced Buffer<T extends ArrayBufferLike>,
 * making the existing declaration structurally incompatible. Adding an overload here
 * widens the accepted type without replacing the original declaration.
 *
 * Track upstream fix: https://github.com/exceljs/exceljs/pull/2811
 */
import "exceljs";

declare module "exceljs" {
  interface Xlsx {
    load(buffer: Buffer<ArrayBufferLike>, options?: Partial<XlsxReadOptions>): Promise<Workbook>;
  }
}
