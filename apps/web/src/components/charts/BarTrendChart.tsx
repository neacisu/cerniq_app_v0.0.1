import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

type BarPoint = { label: string; value: number };

export function BarTrendChart({ data }: { data: BarPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 240 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const nextWidth = Math.max(0, Math.floor(el.clientWidth));
      const nextHeight = Math.max(240, Math.floor(el.clientHeight || 240));
      setSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight },
      );
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-[240px] min-h-[240px] w-full min-w-0">
      {size.width > 0 ? (
        <BarChart width={size.width} height={size.height} data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-s700)" />
          <XAxis dataKey="label" stroke="var(--color-t3)" />
          <YAxis stroke="var(--color-t3)" />
          <Tooltip />
          <Bar dataKey="value" fill="var(--color-b5)" radius={[6, 6, 0, 0]} />
        </BarChart>
      ) : null}
    </div>
  );
}
