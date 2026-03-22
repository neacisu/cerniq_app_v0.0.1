import { useState, useId, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { useOutreachTemplate, useUpdateTemplate } from "@/hooks/use-etapa2.js";
import type { OutreachTemplate, TemplateStatus } from "@/lib/etapa2-api.js";
import { toast } from "sonner";
import { VariableInserter } from "@/components/outreach/templates/VariableInserter.js";

const VAR_RE = /\{\{(\w+)\}\}/g;
const SPINTAX_RE = /\{([^}]+)\}/g;

function extractVariables(text: string): string[] {
  const vars = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = VAR_RE.exec(text)) !== null) vars.add(m[1]);
  return Array.from(vars);
}

function highlightSpintax(text: string): string {
  return text
    .replaceAll(SPINTAX_RE, (_, inner) => `<span class="text-purple-400">{${inner}}</span>`)
    .replaceAll(VAR_RE, (_, v) => `<span class="text-b5">{{${v}}}</span>`);
}

const STATUSES: TemplateStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

type TemplateEditFormProps = {
  readonly templateId: string;
  readonly template: OutreachTemplate;
};

function TemplateEditForm({ templateId, template }: TemplateEditFormProps) {
  const formId = useId();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useUpdateTemplate();

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [subject, setSubject] = useState(template.subject ?? "");
  const [bodyTemplate, setBodyTemplate] = useState(template.bodyTemplate);
  const [status, setStatus] = useState<TemplateStatus>(template.status);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const variables = extractVariables(bodyTemplate);

  const handleSave = async () => {
    try {
      await mutateAsync({
        id: templateId,
        payload: {
          name: name.trim(),
          description: description.trim() || undefined,
          subject: subject.trim() || undefined,
          bodyTemplate: bodyTemplate.trim(),
          status,
          variables,
        },
      });
      toast.success("Template actualizat");
      navigate("/outreach/templates");
    } catch {
      toast.error("Eroare la actualizare");
    }
  };

  return (
    <PageWrapper title={`Editare: ${name || "Template"}`}>
      <div className="grid grid-cols-[1fr_340px] gap-4 max-[800px]:grid-cols-1 max-w-4xl">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalii</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${formId}-name`} className="mb-1 block text-xs text-t3">
                    Nume
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
                  <input
                    id={`${formId}-description`}
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none focus:border-b5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="mb-1 block text-xs text-t3">Canal</span>
                    <p
                      className="text-sm text-t2 py-2"
                      aria-label={`Canal template: ${template.channel}`}
                    >
                      {template.channel}
                    </p>
                  </div>
                  <div>
                    <label htmlFor={`${formId}-status`} className="mb-1 block text-xs text-t3">
                      Status
                    </label>
                    <select
                      id={`${formId}-status`}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TemplateStatus)}
                      className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {template.channel === "EMAIL" && (
                  <div>
                    <label htmlFor={`${formId}-subject`} className="mb-1 block text-xs text-t3">
                      Subiect
                    </label>
                    <input
                      id={`${formId}-subject`}
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none focus:border-b5"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor={`${formId}-body`} className="mb-1 block text-xs text-t3">
                    Corp Mesaj
                  </label>
                  <VariableInserter
                    textareaRef={bodyRef}
                    value={bodyTemplate}
                    onChange={setBodyTemplate}
                    className="mb-2"
                  />
                  <textarea
                    ref={bodyRef}
                    id={`${formId}-body`}
                    rows={8}
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    className="w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 font-mono text-sm text-t1 focus:outline-none focus:border-b5"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate("/outreach/templates")}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardBody>
              <div
                className="rounded-md bg-s900 p-3 font-mono text-sm text-t2 min-h-24 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightSpintax(bodyTemplate) }}
              />
            </CardBody>
          </Card>
          {variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variabile</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-1">
                  {variables.map((v) => (
                    <Badge key={v} variant="brand">{`{{${v}}}`}</Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

export function TemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOutreachTemplate(id);

  if (isLoading) {
    return (
      <PageWrapper title="Editare Template">
        <Skeleton className="h-64 rounded-lg" />
      </PageWrapper>
    );
  }

  const t = data?.data;
  if (!id || !t) {
    return (
      <PageWrapper title="Template negăsit">
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm text-t2">Nu am putut încărca template-ul sau ID-ul lipsește.</p>
            <Button variant="outline" onClick={() => navigate("/outreach/templates")}>
              Înapoi la listă
            </Button>
          </CardBody>
        </Card>
      </PageWrapper>
    );
  }

  return <TemplateEditForm key={t.id} templateId={id} template={t} />;
}
