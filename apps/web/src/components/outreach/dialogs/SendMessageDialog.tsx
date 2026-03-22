import { useState } from "react";
import { Button } from "@/components/ui/index.js";
import { useSendMessage } from "@/hooks/use-etapa2.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils.js";

interface SendMessageDialogProps {
  readonly leadId: string;
  readonly isHumanControlled?: boolean;
  readonly onClose: () => void;
}

export function SendMessageDialog({
  leadId,
  isHumanControlled,
  onClose,
}: Readonly<SendMessageDialogProps>) {
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL_WARM">("WHATSAPP");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const { mutateAsync, isPending } = useSendMessage();

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error("Conținutul mesajului este obligatoriu");
      return;
    }
    try {
      await mutateAsync({
        id: leadId,
        payload: { channel, content: content.trim(), subject: subject.trim() || undefined },
      });
      toast.success("Mesaj trimis cu succes");
      onClose();
    } catch {
      toast.error("Eroare la trimiterea mesajului");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-s950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-s600 bg-s800 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-t1">Trimite Mesaj</h3>
          <button type="button" onClick={onClose} className="text-t3 hover:text-t1">
            ✕
          </button>
        </div>

        {!isHumanControlled && (
          <div className="mb-3 rounded-md bg-amber-900/20 border border-amber-800/40 p-2 text-xs text-amber-400">
            ⚠ Lead-ul nu este în control uman. Mesajele manuale vor activa takeover automat.
          </div>
        )}

        <div className="mb-3 flex gap-2">
          {(["WHATSAPP", "EMAIL_WARM"] as const).map((ch) => (
            <button
              type="button"
              key={ch}
              onClick={() => setChannel(ch)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-sm font-medium",
                channel === ch ? "bg-b5 text-s950" : "bg-s700 text-t2 hover:bg-s600",
              )}
            >
              {ch === "WHATSAPP" ? "WhatsApp" : "Email Cald"}
            </button>
          ))}
        </div>

        {channel === "EMAIL_WARM" && (
          <input
            type="text"
            placeholder="Subiect email"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mb-3 w-full rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
          />
        )}

        <textarea
          rows={4}
          placeholder="Scrie mesajul tău..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mb-4 w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
        />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Anulează
          </Button>
          <Button size="sm" onClick={handleSend} disabled={isPending || !content.trim()}>
            {isPending ? "Se trimite..." : "Trimite"}
          </Button>
        </div>
      </div>
    </div>
  );
}
