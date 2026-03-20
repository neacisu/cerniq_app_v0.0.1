import { useState, useId } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { useOutreachSequence, useUpdateSequence } from "@/hooks/use-etapa2.js";
import type { LeadChannel, OutreachSequence, SequenceStep } from "@/lib/etapa2-api.js";
import { toast } from "sonner";

interface StepDraft {
  /** Cheie stabilă listă (evită `key={index}` și drift la reordonare). */
  draftKey: string;
  id?: string;
  stepNumber: number;
  channel: LeadChannel;
  delayHours: number;
  delayMinutes: number;
  subject: string;
}

function newDraftKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `step-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function stepsToDrafts(steps: SequenceStep[] | undefined): StepDraft[] {
  return (steps ?? []).map((s) => ({
    draftKey: s.id ?? newDraftKey(),
    id: s.id,
    stepNumber: s.stepNumber,
    channel: s.channel,
    delayHours: s.delayHours,
    delayMinutes: s.delayMinutes,
    subject: s.subject ?? "",
  }));
}

const CHANNELS: LeadChannel[] = ["WHATSAPP", "EMAIL_COLD", "EMAIL_WARM"];

type SequenceEditFormProps = {
  readonly sequenceId: string;
  readonly sequence: OutreachSequence;
};

function SequenceEditForm({ sequenceId, sequence }: SequenceEditFormProps) {
  const formId = useId();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useUpdateSequence();

  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description ?? "");
  const [stopOnReply, setStopOnReply] = useState(sequence.stopOnReply);
  const [respectBusinessHours, setRespectBusinessHours] = useState(sequence.respectBusinessHours);
  const [steps, setSteps] = useState<StepDraft[]>(() => stepsToDrafts(sequence.steps));

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      {
        draftKey: newDraftKey(),
        stepNumber: prev.length + 1,
        channel: "EMAIL_COLD",
        delayHours: 24,
        delayMinutes: 0,
        subject: "",
      },
    ]);

  const removeStep = (idx: number) =>
    setSteps((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })),
    );

  const updateStep = (idx: number, patch: Partial<StepDraft>) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await mutateAsync({
        id: sequenceId,
        payload: {
          name: name.trim(),
          description: description.trim() || undefined,
          stopOnReply,
          respectBusinessHours,
          steps: steps.map((s) => ({
            channel: s.channel,
            delayHours: s.delayHours,
            delayMinutes: s.delayMinutes,
          })),
        },
      });
      toast.success("Secvență actualizată");
      navigate("/outreach/sequences");
    } catch {
      toast.error("Eroare la actualizare");
    }
  };

  return (
    <PageWrapper title={`Editare: ${name || "Secvență"}`}>
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Detalii</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div>
                <label htmlFor={`${formId}-name`} className="mb-1 block text-xs text-t3">
                  Nume *
                </label>
                <input
                  id={`${formId}-name`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none focus:border-b5"
                />
              </div>
              <div>
                <label htmlFor={`${formId}-description`} className="mb-1 block text-xs text-t3">
                  Descriere
                </label>
                <textarea
                  id={`${formId}-description`}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none focus:border-b5"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id={`${formId}-stop-on-reply`}
                    type="checkbox"
                    checked={stopOnReply}
                    onChange={(e) => setStopOnReply(e.target.checked)}
                    className="accent-b5"
                  />
                  <label
                    htmlFor={`${formId}-stop-on-reply`}
                    className="text-sm text-t2 cursor-pointer"
                  >
                    Oprire la răspuns
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`${formId}-business-hours`}
                    type="checkbox"
                    checked={respectBusinessHours}
                    onChange={(e) => setRespectBusinessHours(e.target.checked)}
                    className="accent-b5"
                  />
                  <label
                    htmlFor={`${formId}-business-hours`}
                    className="text-sm text-t2 cursor-pointer"
                  >
                    Ore de lucru
                  </label>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pași ({steps.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={addStep}>
                + Pas
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={step.draftKey} className="rounded-md border border-s600 bg-s700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-b5">Pas {step.stepNumber}</span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Șterge
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label
                        htmlFor={`${formId}-step-${step.draftKey}-channel`}
                        className="text-xs text-t3 mb-1 block"
                      >
                        Canal
                      </label>
                      <select
                        id={`${formId}-step-${step.draftKey}-channel`}
                        value={step.channel}
                        onChange={(e) =>
                          updateStep(idx, { channel: e.target.value as LeadChannel })
                        }
                        className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm text-t1 focus:outline-none"
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
                        htmlFor={`${formId}-step-${step.draftKey}-delay-h`}
                        className="text-xs text-t3 mb-1 block"
                      >
                        Delay (h)
                      </label>
                      <input
                        id={`${formId}-step-${step.draftKey}-delay-h`}
                        type="number"
                        min={0}
                        value={step.delayHours}
                        onChange={(e) => updateStep(idx, { delayHours: Number(e.target.value) })}
                        className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm text-t1 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${formId}-step-${step.draftKey}-delay-m`}
                        className="text-xs text-t3 mb-1 block"
                      >
                        Delay (m)
                      </label>
                      <input
                        id={`${formId}-step-${step.draftKey}-delay-m`}
                        type="number"
                        min={0}
                        max={59}
                        value={step.delayMinutes}
                        onChange={(e) => updateStep(idx, { delayMinutes: Number(e.target.value) })}
                        className="w-full rounded border border-s500 bg-s600 px-2 py-1.5 text-sm text-t1 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/outreach/sequences")}>
            Anulează
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Se salvează..." : "Salvează"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}

export function SequenceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOutreachSequence(id);

  if (isLoading) {
    return (
      <PageWrapper title="Editare Secvență">
        <Skeleton className="h-64 rounded-lg" />
      </PageWrapper>
    );
  }

  const seq = data?.data;
  if (!id || !seq) {
    return (
      <PageWrapper title="Secvență negăsită">
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm text-t2">Nu am putut încărca secvența sau ID-ul lipsește.</p>
            <Button variant="outline" onClick={() => navigate("/outreach/sequences")}>
              Înapoi la listă
            </Button>
          </CardBody>
        </Card>
      </PageWrapper>
    );
  }

  return <SequenceEditForm key={seq.id} sequenceId={id} sequence={seq} />;
}
