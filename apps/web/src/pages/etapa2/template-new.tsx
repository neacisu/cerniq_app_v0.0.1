import { useState, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@/components/ui/index.js";
import { useCreateTemplate } from "@/hooks/use-etapa2.js";
import type { TemplateChannel, TemplateType } from "@/lib/etapa2-api.js";
import { toast } from "sonner";
import { VariableInserter } from "@/components/outreach/templates/VariableInserter.js";

const SPINTAX_RE = /\{([^}]+)\}/g;
const VAR_RE = /\{\{(\w+)\}\}/g;

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

const TEMPLATE_TYPES: TemplateType[] = ["INITIAL", "FOLLOWUP", "RESPONSE", "CLOSING"];

export function TemplateNew() {
  const formId = useId();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<TemplateChannel>("WHATSAPP");
  const [templateType, setTemplateType] = useState<TemplateType>("INITIAL");
  const [subject, setSubject] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const variables = extractVariables(bodyTemplate);

  const handleSave = async () => {
    if (!name.trim() || !bodyTemplate.trim()) {
      toast.error("Numele și corpul templateului sunt obligatorii");
      return;
    }
    try {
      await mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        channel,
        templateType,
        subject: subject.trim() || undefined,
        bodyTemplate: bodyTemplate.trim(),
        variables,
      });
      toast.success("Template creat cu succes");
      navigate("/outreach/templates");
    } catch {
      toast.error("Eroare la creare");
    }
  };

  return (
    <PageWrapper title="Template Nou">
      <div className="grid grid-cols-[1fr_340px] gap-4 max-[800px]:grid-cols-1 max-w-4xl">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalii Template</CardTitle>
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
                    placeholder="Ex: Intro Agro WA"
                    className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
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
                    <label htmlFor={`${formId}-channel`} className="mb-1 block text-xs text-t3">
                      Canal
                    </label>
                    <select
                      id={`${formId}-channel`}
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as TemplateChannel)}
                      className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`${formId}-template-type`}
                      className="mb-1 block text-xs text-t3"
                    >
                      Tip
                    </label>
                    <select
                      id={`${formId}-template-type`}
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                      className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none"
                    >
                      {TEMPLATE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {channel === "EMAIL" && (
                  <div>
                    <label htmlFor={`${formId}-subject`} className="mb-1 block text-xs text-t3">
                      Subiect Email
                    </label>
                    <input
                      id={`${formId}-subject`}
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subiect email"
                      className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor={`${formId}-body`} className="mb-1 block text-xs text-t3">
                    Corp Mesaj *
                  </label>
                  <p id={`${formId}-body-hint`} className="mb-1 text-xs text-t3">
                    Suportă spintax <span className="text-purple-400">{`{opțiune1|opțiune2}`}</span>{" "}
                    și variabile <span className="text-b5">{`{{variabila}}`}</span>
                  </p>
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
                    placeholder="Bună {{contact}}, {firma|compania} noastră..."
                    aria-describedby={`${formId}-body-hint`}
                    className="w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 font-mono text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate("/outreach/templates")}>
              Anulează
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !name.trim() || !bodyTemplate.trim()}
            >
              {isPending ? "Se salvează..." : "Creează Template"}
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
                className="rounded-md bg-s900 p-3 font-mono text-sm text-t2 min-h-24 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html:
                    highlightSpintax(bodyTemplate) ||
                    '<span class="text-t4">Preview mesaj...</span>',
                }}
              />
            </CardBody>
          </Card>

          {variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variabile detectate</CardTitle>
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
