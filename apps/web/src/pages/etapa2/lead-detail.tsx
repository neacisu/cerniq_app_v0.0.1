import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody, Button } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { StageBadge } from "@/components/outreach/shared/StageBadge.js";
import { ChannelIcon } from "@/components/outreach/shared/ChannelIcon.js";
import { SentimentIndicator } from "@/components/outreach/shared/SentimentIndicator.js";
import { MessageBubble } from "@/components/outreach/conversation/MessageBubble.js";
import { useOutreachLead, useLeadActivity, useSendMessage } from "@/hooks/use-etapa2.js";
import type { CommunicationLog } from "@/lib/etapa2-api.js";
import { StateChangeDialog } from "@/components/outreach/dialogs/StateChangeDialog.js";
import { EnrollSequenceDialog } from "@/components/outreach/dialogs/EnrollSequenceDialog.js";
import { TakeoverDialog } from "@/components/outreach/dialogs/TakeoverDialog.js";
import { LeadStateHistory } from "@/components/outreach/leads/LeadStateHistory.js";

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOutreachLead(id);
  const { data: actRes } = useLeadActivity(id);
  const { mutateAsync: sendRetry, isPending: retryPending } = useSendMessage();
  const lead = data?.data;
  const activity = actRes?.data ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);
  const [stateOpen, setStateOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [takeoverOpen, setTakeoverOpen] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lead?.communications?.length]);

  if (isLoading) {
    return (
      <PageWrapper title="Detalii Lead">
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  if (!lead) {
    return (
      <PageWrapper title="Lead Negăsit">
        <div className="text-center py-12 text-t3">
          <p>Lead-ul nu a fost găsit sau nu aveți acces.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/outreach/leads")}>
            ← Înapoi la liste
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={lead.company?.name ?? "Lead Detail"}>
      <div className="flex items-center gap-2 text-sm text-t3 mb-4">
        <Link to="/outreach/leads" className="hover:text-t1">
          Leads
        </Link>
        <span>/</span>
        <span className="text-t1">{lead.company?.name ?? lead.id}</span>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4 max-[900px]:grid-cols-1">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{lead.company?.name ?? "—"}</CardTitle>
                <StageBadge stage={lead.currentState} />
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-t3 text-xs">Canal</p>
                  <p className="text-t1">
                    {lead.channel ? (
                      <span className="flex items-center gap-1">
                        <ChannelIcon channel={lead.channel} size="sm" />
                        {lead.channel}
                      </span>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-t3 text-xs">Sentiment</p>
                  <SentimentIndicator
                    score={lead.sentimentScore ?? null}
                    showLabel
                    showScore
                    variant="icon"
                  />
                </div>
                <div>
                  <p className="text-t3 text-xs">Ultimul contact</p>
                  <p className="text-t1">
                    {lead.lastContactAt
                      ? new Date(lead.lastContactAt).toLocaleString("ro-RO")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-t3 text-xs">Următoarea acțiune</p>
                  <p className="text-t1">
                    {lead.nextActionAt ? new Date(lead.nextActionAt).toLocaleString("ro-RO") : "—"}
                  </p>
                </div>
                {lead.isHumanControlled && (
                  <div className="col-span-2">
                    <span className="text-xs text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded">
                      🔒 Controlat uman
                    </span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <LeadStateHistory lead={lead} />

          <Card>
            <CardHeader>
              <CardTitle>Activity log</CardTitle>
            </CardHeader>
            <CardBody>
              {activity.length === 0 ? (
                <p className="text-t3 text-sm">Nicio activitate agregată.</p>
              ) : (
                <ul className="space-y-2 text-xs max-h-52 overflow-y-auto">
                  {activity.map((a, i) => (
                    <li key={`${a.timestamp}-${i}`} className="border-l-2 border-s600 pl-2">
                      <span className="text-t3">
                        {new Date(a.timestamp).toLocaleString("ro-RO")}
                      </span>{" "}
                      <span className="text-t3">[{a.type}]</span>
                      <p className="text-t2 mt-0.5">{a.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conversație ({lead.communications?.length ?? 0} mesaje)</CardTitle>
                <Link
                  to={`/outreach/leads/${lead.id}/conversation`}
                  className="text-xs text-b5 hover:underline"
                >
                  Vizualizare completă →
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(lead.communications ?? []).slice(-10).map((comm: CommunicationLog) => (
                  <MessageBubble
                    key={comm.id}
                    direction={comm.direction}
                    content={comm.contentPreview}
                    channel={comm.channel}
                    status={comm.status}
                    timestamp={comm.createdAt}
                    retryPending={retryPending}
                    onRetry={
                      comm.direction === "OUTBOUND" &&
                      (comm.status === "FAILED" || comm.status === "BOUNCED")
                        ? async () => {
                            await sendRetry({
                              id: lead.id,
                              payload: {
                                channel: comm.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL_WARM",
                                content: (comm.contentPreview ?? "").trim() || "(retry)",
                              },
                            });
                          }
                        : undefined
                    }
                  />
                ))}
                {(!lead.communications || lead.communications.length === 0) && (
                  <p className="text-t3 text-sm text-center py-4">Nicio comunicare</p>
                )}
                <div ref={bottomRef} />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Companie</CardTitle>
            </CardHeader>
            <CardBody>
              {lead.company ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-t3 text-xs">CUI</p>
                    <p className="text-t1">{lead.company.cui}</p>
                  </div>
                  <div>
                    <p className="text-t3 text-xs">Județ</p>
                    <p className="text-t1">{lead.company.judet}</p>
                  </div>
                  <div>
                    <p className="text-t3 text-xs">Localitate</p>
                    <p className="text-t1">{lead.company.localitate}</p>
                  </div>
                  {lead.company.telefon && (
                    <div>
                      <p className="text-t3 text-xs">Telefon</p>
                      <p className="text-t1">{lead.company.telefon}</p>
                    </div>
                  )}
                  {lead.company.email && (
                    <div>
                      <p className="text-t3 text-xs">Email</p>
                      <p className="text-t1">{lead.company.email}</p>
                    </div>
                  )}
                  {lead.company.website && (
                    <div>
                      <p className="text-t3 text-xs">Website</p>
                      <a
                        href={lead.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-b5 hover:underline text-sm"
                      >
                        {lead.company.website}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-t3 text-sm">Nicio informație companie</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acțiuni Rapide</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/outreach/leads/${lead.id}/conversation`)}
                >
                  Conversație completă
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setStateOpen(true)}
                >
                  Schimbă stare
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setEnrollOpen(true)}
                >
                  Pornește secvență
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setTakeoverOpen(true)}
                >
                  Preia control (HITL)
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {stateOpen && (
        <StateChangeDialog
          leadId={lead.id}
          currentState={lead.currentState}
          companyName={lead.company?.name}
          onClose={() => setStateOpen(false)}
        />
      )}
      {enrollOpen && (
        <EnrollSequenceDialog leadIds={[lead.id]} onClose={() => setEnrollOpen(false)} />
      )}
      {takeoverOpen && (
        <TakeoverDialog
          leadId={lead.id}
          companyName={lead.company?.name}
          onClose={() => setTakeoverOpen(false)}
        />
      )}
    </PageWrapper>
  );
}
