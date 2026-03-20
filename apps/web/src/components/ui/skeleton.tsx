import { cn } from "@/lib/utils.js";

type SkeletonProps = Readonly<{
  className?: string;
}>;

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("sk", className)} />;
}
