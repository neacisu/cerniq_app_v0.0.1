import { useState, useId } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import {
  useOutreachSequence,
  useOutreachTemplates,
  useUpdateSequence,
} from "@/hooks/use-etapa2.js";
import type { OutreachSequence, SequenceStep } from "@/lib/etapa2-api.js";
import { toast } from "sonner";
import {
  SequenceBuilder,
  type SequenceBuilderStep,
} from "@/components/outreach/sequences/SequenceBuilder.js";
import { SequenceTimeline } from "@/components/outreach/sequences/SequenceTimeline.js";

function newDraftKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `step-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function stepsToDrafts(steps: SequenceStep[] | undefined): SequenceBuilderStep[] {
  return (steps ?? []).map((s) => ({
    draftKey: s.id ?? newDraftKey(),
    stepNumber: s.stepNumber,
    channel: s.channel,
    delayHours: s.delayHours,
    delayMinutes: s.delayMinutes,
    subject: s.subject ?? "",
    templateId: s.templateId ?? "",
  }));
}

type SequenceEditFormProps = {
  readonly sequenceId: string;
  readonly sequence: OutreachSequence;
};

function SequenceEditForm({ sequenceId, sequence }: SequenceEditFormProps) {
  const formId = useId();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useUpdateSequence();
  const { data: tplData } = useOutreachTemplates({ status: "ACTIVE", limit: 200 });
  const templates = tplData?.data ?? [];

  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description ?? "");
  const [stopOnReply, setStopOnReply] = useState(sequence.stopOnReply);
  const [respectBusinessHours, setRespectBusinessHours] = useState(sequence.respectBusinessHours);
  const [steps, setSteps] = useState<SequenceBuilderStep[]>(() => stepsToDrafts(sequence.steps));

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
        templateId: "",
      },
    ]);

  const removeStep = (idx: number) =>
    setSteps((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })),
    );

  const updateStep = (idx: number, patch: Partial<SequenceBuilderStep>) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (steps.some((s) => !s.templateId)) {
      toast.error("Selectați un template pentru fiecare pas.");
      return;
    }
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
            templateId: s.templateId,
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
            <CardTitle>Constructor secvență</CardTitle>
          </CardHeader>
          <CardBody>
            <SequenceBuilder
              formIdPrefix={formId}
              steps={steps}
              templates={templates}
              onAddStep={addStep}
              onRemoveStep={removeStep}
              onUpdateStep={updateStep}
              onMoveStep={moveStep}
            />
            <div className="mt-6 border-t border-[var(--color-s700)] pt-4">
              <SequenceTimeline
                steps={steps.map(
                  (s): SequenceStep => ({
                    id: s.draftKey,
                    sequenceId: sequence.id,
                    stepNumber: s.stepNumber,
                    channel: s.channel,
                    templateId: s.templateId || null,
                    delayHours: s.delayHours,
                    delayMinutes: s.delayMinutes,
                    subject: s.subject.trim() || null,
                  }),
                )}
              />
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
