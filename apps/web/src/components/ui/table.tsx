import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils.js";

export function TableWrapper({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("tw", className)} {...props}>
      {children}
    </div>
  );
}

export function TableRoot({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("tbl", className)} {...props}>
      {children}
    </table>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn(className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn(className)} {...props} />;
}
