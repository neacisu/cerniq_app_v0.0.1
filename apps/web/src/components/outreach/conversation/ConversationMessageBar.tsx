import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/index.js";
import { useOutreachTemplates, useSendMessage } from "@/hooks/use-etapa2.js";
import type { OutreachLead, TemplateChannel } from "@/lib/etapa2-api.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils.js";
import { voidAsyncHandler } from "@/lib/void-async-handlers.js";

const MAX_WA = 4096;

type ConversationMessageBarProps = {
  readonly leadId: string;
  readonly lead: OutreachLead | undefined;
};

/**
 * Bară fixă jos — trimitere mesaje fără modal (spec etapa2-ui-pages §3.3).
 * `key={leadId}` pe inner remontează starea la schimbare lead (fără useEffect + setState).
 */
export function ConversationMessageBar({ leadId, lead }: Readonly<ConversationMessageBarProps>) {
  return <ConversationMessageBarInner key={leadId} leadId={leadId} lead={lead} />;
}

function ConversationMessageBarInner({ leadId, lead }: Readonly<ConversationMessageBarProps>) {
  /** Preferință din backend; se actualizează la invalidare query fără efecte. */
  const derivedChannel = useMemo<"WHATSAPP" | "EMAIL_WARM">(() => {
    if (!lead) return "WHATSAPP";
    return lead.lastChannelUsed === "WHATSAPP" ? "WHATSAPP" : "EMAIL_WARM";
  }, [lead]);

  /** Alegere explicită a utilizatorului (butoane); null = urmează `derivedChannel`. */
  const [channelOverride, setChannelOverride] = useState<"WHATSAPP" | "EMAIL_WARM" | null>(null);
  const channel = channelOverride ?? derivedChannel;

  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { mutateAsync, isPending } = useSendMessage();

  useEffect(() => {
    taRef.current?.focus();
  }, [leadId]);

  const templateChannel: TemplateChannel = channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL";
  const { data: tplData } = useOutreachTemplates({
    channel: templateChannel,
    status: "ACTIVE",
    limit: 5,
  });
  const templates = tplData?.data ?? [];

  const maxLen = channel === "WHATSAPP" ? MAX_WA : 100_000;

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error("Conținutul mesajului este obligatoriu");
      return;
    }
    if (content.length > maxLen) {
      toast.error(`Mesajul depășește limita (${maxLen} caractere).`);
      return;
    }
    let scheduledAt: string | undefined;
    if (schedule && scheduledAtLocal) {
      const d = new Date(scheduledAtLocal);
      if (!Number.isNaN(d.getTime())) {
        scheduledAt = d.toISOString();
      }
    }
    try {
      await mutateAsync({
        id: leadId,
        payload: {
          channel,
          content: content.trim(),
          subject: channel === "EMAIL_WARM" ? subject.trim() || undefined : undefined,
          scheduledAt,
        },
      });
      toast.success("Mesaj trimis");
      setContent("");
    } catch {
      toast.error("Eroare la trimiterea mesajului");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend().catch(voidAsyncHandler);
    }
  };

  return (
    <div className="border-t border-s700 bg-s850 p-3 space-y-2">
      {!lead?.isHumanControlled && (
        <div className="rounded-md bg-amber-900/20 border border-amber-800/40 px-2 py-1 text-[11px] text-amber-400">
          Lead fără control uman — mesajul poate activa takeover automat.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-t3">Canal</span>
        {(["WHATSAPP", "EMAIL_WARM"] as const).map((ch) => (
          <button
            type="button"
            key={ch}
            onClick={() => setChannelOverride(ch)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium",
              channel === ch ? "bg-b5 text-s950" : "bg-s700 text-t2 hover:bg-s600",
            )}
          >
            {ch === "WHATSAPP" ? "WhatsApp" : "Email cald"}
          </button>
        ))}

        <div className="relative ml-auto">
          <button
            type="button"
            className="rounded-md border border-s600 px-2 py-1 text-xs text-t2 hover:bg-s700"
            onClick={() => setShowTemplates((s) => !s)}
          >
            Template
          </button>
          {showTemplates && templates.length > 0 && (
            <div className="absolute bottom-full right-0 mb-1 z-10 min-w-[200px] rounded-md border border-s600 bg-s800 py-1 shadow-lg">
              {templates.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className="block w-full px-3 py-1.5 text-left text-xs text-t2 hover:bg-s700"
                  onClick={() => {
                    setContent(t.bodyTemplate);
                    setSubject(t.subject ?? "");
                    setShowTemplates(false);
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {channel === "EMAIL_WARM" && (
        <input
          type="text"
          placeholder="Subiect email"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3"
        />
      )}

      <textarea
        ref={taRef}
        rows={3}
        placeholder="Scrie mesajul… (Ctrl+Enter trimite)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full resize-y rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5 min-h-[72px]"
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-t3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={schedule}
            onChange={(e) => setSchedule(e.target.checked)}
          />{" "}
          <span>Programează trimitere</span>
        </label>
        {schedule && (
          <input
            type="datetime-local"
            value={scheduledAtLocal}
            onChange={(e) => setScheduledAtLocal(e.target.value)}
            className="rounded border border-s600 bg-s700 px-2 py-1 text-t1"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-t3">
          {content.length} / {maxLen}
        </span>
        <Button
          size="sm"
          onClick={() => {
            handleSend().catch(voidAsyncHandler);
          }}
          disabled={isPending || !lead || !content.trim()}
        >
          {isPending ? "Se trimite…" : "Trimite"}
        </Button>
      </div>
    </div>
  );
}
