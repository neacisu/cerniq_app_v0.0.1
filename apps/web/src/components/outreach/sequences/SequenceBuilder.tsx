import { Button } from "@/components/ui/index.js";
import { ChannelBadge } from "@/components/outreach/shared/ChannelIcon.js";
import type { LeadChannel, OutreachTemplate } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

export type SequenceBuilderStep = {
  draftKey: string;
  stepNumber: number;
  channel: LeadChannel;
  delayHours: number;
  delayMinutes: number;
  subject: string;
  templateId: string;
};

const CHANNELS: LeadChannel[] = ["WHATSAPP", "EMAIL_COLD", "EMAIL_WARM"];

function channelToTemplateFilter(ch: LeadChannel): "WHATSAPP" | "EMAIL" {
  return ch === "WHATSAPP" ? "WHATSAPP" : "EMAIL";
}

type SequenceBuilderProps = {
  readonly formIdPrefix: string;
  readonly steps: SequenceBuilderStep[];
  readonly templates: OutreachTemplate[];
  readonly onAddStep: () => void;
  readonly onRemoveStep: (idx: number) => void;
  readonly onUpdateStep: (idx: number, patch: Partial<SequenceBuilderStep>) => void;
  readonly onMoveStep: (idx: number, dir: -1 | 1) => void;
};

/**
 * Timeline vertical cu pași, canal, template, delay (spec etapa2-ui-pages §6).
 */
export function SequenceBuilder({
  formIdPrefix,
  steps,
  templates,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onMoveStep,
}: Readonly<SequenceBuilderProps>) {
  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-t1">Pași ({steps.length})</span>
        <Button size="sm" variant="outline" type="button" onClick={onAddStep}>
          + Pas
        </Button>
      </div>

      <div className="relative border-l-2 border-s600 ml-3 pl-6 space-y-6">
        {steps.map((step, idx) => {
          const filtered = templates.filter(
            (t) => t.channel === channelToTemplateFilter(step.channel),
          );
          const delayLabel =
            idx === 0
              ? "Start imediat după înrolare"
              : `După pasul ${idx}: ${step.delayHours}h ${step.delayMinutes}m`;

          return (
            <div key={step.draftKey} className="relative">
              <div
                className={cn(
                  "absolute -left-[29px] top-1 flex h-8 w-8 items-center justify-center rounded-full",
                  "border-2 border-b5 bg-s800 text-xs font-bold text-b5",
                )}
              >
                {idx + 1}
              </div>
              <div className="rounded-lg border border-s600 bg-s700/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={step.channel} size="sm" />
                    <span className="text-xs text-t3">{delayLabel}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="text-xs text-t3 hover:text-t1 disabled:opacity-30"
                      disabled={idx === 0}
                      onClick={() => onMoveStep(idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-xs text-t3 hover:text-t1 disabled:opacity-30"
                      disabled={idx === steps.length - 1}
                      onClick={() => onMoveStep(idx, 1)}
                    >
                      ↓
                    </button>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:text-red-300"
                        onClick={() => onRemoveStep(idx)}
                      >
                        Șterge
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-xs text-t3 mb-1 block"
                      htmlFor={`${formIdPrefix}-ch-${step.draftKey}`}
                    >
                      Canal
                    </label>
                    <select
                      id={`${formIdPrefix}-ch-${step.draftKey}`}
                      value={step.channel}
                      onChange={(e) =>
                        onUpdateStep(idx, { channel: e.target.value as LeadChannel })
                      }
                      className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm text-t1"
                    >
                      {CHANNELS.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="text-xs text-t3 mb-1 block"
                      htmlFor={`${formIdPrefix}-tpl-${step.draftKey}`}
                    >
                      Template *
                    </label>
                    <select
                      id={`${formIdPrefix}-tpl-${step.draftKey}`}
                      value={step.templateId}
                      onChange={(e) => onUpdateStep(idx, { templateId: e.target.value })}
                      className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm text-t1"
                    >
                      <option value="">— selectează —</option>
                      {filtered.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {idx > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        className="text-xs text-t3 mb-1 block"
                        htmlFor={`${formIdPrefix}-dh-${step.draftKey}`}
                      >
                        Delay ore
                      </label>
                      <input
                        id={`${formIdPrefix}-dh-${step.draftKey}`}
                        type="number"
                        min={0}
                        value={step.delayHours}
                        onChange={(e) => onUpdateStep(idx, { delayHours: Number(e.target.value) })}
                        className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label
                        className="text-xs text-t3 mb-1 block"
                        htmlFor={`${formIdPrefix}-dm-${step.draftKey}`}
                      >
                        Delay min
                      </label>
                      <input
                        id={`${formIdPrefix}-dm-${step.draftKey}`}
                        type="number"
                        min={0}
                        max={59}
                        value={step.delayMinutes}
                        onChange={(e) =>
                          onUpdateStep(idx, { delayMinutes: Number(e.target.value) })
                        }
                        className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}

                {(step.channel === "EMAIL_COLD" || step.channel === "EMAIL_WARM") && (
                  <div>
                    <label
                      className="text-xs text-t3 mb-1 block"
                      htmlFor={`${formIdPrefix}-sub-${step.draftKey}`}
                    >
                      Subiect email (opțional)
                    </label>
                    <input
                      id={`${formIdPrefix}-sub-${step.draftKey}`}
                      type="text"
                      value={step.subject}
                      onChange={(e) => onUpdateStep(idx, { subject: e.target.value })}
                      className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm text-t1"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
