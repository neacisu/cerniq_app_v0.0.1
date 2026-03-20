import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { ConversationTimeline } from "@/components/outreach/conversation/ConversationTimeline.js";
import { SendMessageDialog } from "@/components/outreach/dialogs/SendMessageDialog.js";
import { useOutreachLead } from "@/hooks/use-etapa2.js";
import { Button } from "@/components/ui/index.js";

const CONVERSATION_TIMELINE_SKELETON_KEYS = [
  "conv-tl-1",
  "conv-tl-2",
  "conv-tl-3",
  "conv-tl-4",
  "conv-tl-5",
] as const;

export function ConversationView() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useOutreachLead(id);
  const lead = data?.data;
  const [showSend, setShowSend] = useState(false);

  return (
    <PageWrapper title="Conversație Completă">
      <div className="flex items-center gap-2 text-sm text-t3 mb-4">
        <Link to="/outreach/leads" className="hover:text-t1">
          Leads
        </Link>
        <span>/</span>
        {lead && (
          <>
            <Link to={`/outreach/leads/${id}`} className="hover:text-t1">
              {lead.company?.name ?? id}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-t1">Conversație</span>
      </div>

      <div className="flex flex-col h-[calc(100vh-200px)] rounded-xl border border-s700 bg-s800 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 p-4 space-y-3">
            {CONVERSATION_TIMELINE_SKELETON_KEYS.map((k) => (
              <Skeleton key={k} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ConversationTimeline messages={lead?.communications ?? []} autoScroll />
          </div>
        )}

        <div className="border-t border-s700 p-3 flex items-center gap-2 bg-s850">
          <p className="flex-1 text-xs text-t3">
            {lead?.isHumanControlled
              ? "Control uman activ — poți trimite mesaje"
              : "Lead în control AI — activează takeover pentru mesaje manuale"}
          </p>
          <Button size="sm" onClick={() => setShowSend(true)} disabled={!lead}>
            Trimite Mesaj
          </Button>
        </div>
      </div>

      {showSend && id && (
        <SendMessageDialog
          leadId={id}
          isHumanControlled={lead?.isHumanControlled}
          onClose={() => setShowSend(false)}
        />
      )}
    </PageWrapper>
  );
}
