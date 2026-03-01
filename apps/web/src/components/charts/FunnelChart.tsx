import { useEffect, useRef, useState } from "react";
import { FunnelChart as ReFunnelChart, Funnel, Tooltip, LabelList } from "recharts";

type FunnelPoint = {
  name: string;
  value: number;
  fill?: string;
};

export function FunnelChart({ data }: { data: FunnelPoint[] }) {
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
        <ReFunnelChart width={size.width} height={size.height}>
          <Tooltip />
          <Funnel dataKey="value" data={data} isAnimationActive nameKey="name">
            <LabelList position="right" fill="var(--color-t1)" stroke="none" dataKey="name" />
          </Funnel>
        </ReFunnelChart>
      ) : null}
    </div>
  );
}
