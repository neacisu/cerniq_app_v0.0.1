import { useState, useId } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@/components/ui/index.js";
import { useCreateSequence, useOutreachTemplates } from "@/hooks/use-etapa2.js";
import { toast } from "sonner";
import {
  SequenceBuilder,
  type SequenceBuilderStep,
} from "@/components/outreach/sequences/SequenceBuilder.js";

function newDraftKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `step-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function SequenceNew() {
  const formId = useId();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateSequence();
  const { data: tplData } = useOutreachTemplates({ status: "ACTIVE", limit: 200 });
  const templates = tplData?.data ?? [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stopOnReply, setStopOnReply] = useState(true);
  const [respectBusinessHours, setRespectBusinessHours] = useState(true);
  const [steps, setSteps] = useState<SequenceBuilderStep[]>([
    {
      draftKey: newDraftKey(),
      stepNumber: 1,
      channel: "WHATSAPP",
      delayHours: 0,
      delayMinutes: 0,
      subject: "",
      templateId: "",
    },
  ]);

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
    if (!name.trim()) {
      toast.error("Numele secvenței este obligatoriu");
      return;
    }
    if (steps.some((s) => !s.templateId)) {
      toast.error("Selectați un template pentru fiecare pas.");
      return;
    }
    try {
      const primaryChannel = steps.some((s) => s.channel === "WHATSAPP") ? "WHATSAPP" : "EMAIL";
      await mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        primaryChannel,
        stopOnReply,
        respectBusinessHours,
        steps: steps.map((s) => ({
          delayHours: s.delayHours,
          delayMinutes: s.delayMinutes,
          channel: s.channel,
          templateId: s.templateId,
        })),
      });
      toast.success("Secvență creată cu succes");
      navigate("/outreach/sequences");
    } catch {
      toast.error("Eroare la creare");
    }
  };

  return (
    <PageWrapper title="Secvență Nouă">
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Detalii Secvență</CardTitle>
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
                  placeholder="Ex: Agro Intro WA+Email"
                  className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
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
                  className="w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
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
                    Ore de lucru (ADR-0056)
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
          </CardBody>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/outreach/sequences")}>
            Anulează
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? "Se salvează..." : "Creează Secvență"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
