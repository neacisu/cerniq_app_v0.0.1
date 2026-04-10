/**
 * Timeline vertical pentru pașii secvenței (`SequenceStep` din API).
 */
import type { SequenceStep } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

export type SequenceTimelineProps = Readonly<{
  steps: SequenceStep[] | undefined;
  className?: string;
}>;

export function SequenceTimeline({ steps, className }: SequenceTimelineProps) {
  const list = [...(steps ?? [])].sort((a, b) => a.stepNumber - b.stepNumber);

  if (list.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-[var(--color-s600)] p-4 text-sm text-t3",
          className,
        )}
      >
        Niciun pas în secvență.
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <h3 className="mb-3 text-sm font-medium text-t2">Timeline pași</h3>
      <ul className="relative space-y-0 border-l-2 border-[var(--color-s700)] pl-6">
        {list.map((s, idx) => (
          <li key={s.id} className="relative pb-6 last:pb-0">
            <div className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 border-[var(--color-b5)] bg-[var(--color-s900)]" />
            <div className="rounded-lg border border-[var(--color-s700)] bg-[var(--color-s900)]/50 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-t1">
                  Pas {s.stepNumber}
                  <span className="ml-2 font-normal text-t3">· {s.channel}</span>
                </span>
                <span className="text-xs text-t4 font-mono">{s.id.slice(0, 8)}…</span>
              </div>
              <p className="mt-1 text-xs text-t3">
                Întârziere:{" "}
                <strong className="text-t2">
                  {s.delayHours}h {s.delayMinutes}m
                </strong>
                {s.templateId ? (
                  <>
                    {" "}
                    · Template: <code className="font-mono text-t2">{s.templateId}</code>
                  </>
                ) : (
                  <span className="text-er"> · fără template</span>
                )}
              </p>
              {s.subject ? <p className="mt-1 text-xs text-t2">Subiect: {s.subject}</p> : null}
              {idx < list.length - 1 ? (
                <p className="mt-2 text-[10px] uppercase tracking-wide text-t4">
                  Condiție implicită: continuă după întârziere (logica server / SequenceBuilder)
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
