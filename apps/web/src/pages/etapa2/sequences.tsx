import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, Button } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { useOutreachSequences, useUpdateSequence } from "@/hooks/use-etapa2.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils.js";

const SEQUENCE_GRID_SKELETON_KEYS = [
  "sequences-skeleton-1",
  "sequences-skeleton-2",
  "sequences-skeleton-3",
] as const;

export function Sequences() {
  const navigate = useNavigate();
  const { data, isLoading } = useOutreachSequences();
  const { mutateAsync: updateSeq } = useUpdateSequence();

  const sequences = data?.data ?? [];

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateSeq({ id, payload: { isActive: !isActive } });
      toast.success(isActive ? "Secvență oprită" : "Secvență activată");
    } catch {
      toast.error("Eroare la actualizare");
    }
  };

  let listBody: ReactNode;
  if (isLoading) {
    listBody = (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SEQUENCE_GRID_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  } else if (sequences.length === 0) {
    listBody = (
      <div className="flex flex-col items-center justify-center py-16 text-t3">
        <p className="font-medium text-t1">Nicio secvență</p>
        <p className="text-sm mt-1 mb-4">Creează prima ta secvență de outreach</p>
        <Button size="sm" onClick={() => navigate("/outreach/sequences/new")}>
          Creează Secvență
        </Button>
      </div>
    );
  } else {
    listBody = (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sequences.map((seq) => (
          <Card
            key={seq.id}
            className={cn("hover:border-b5 cursor-pointer", !seq.isActive && "opacity-70")}
            onClick={() => navigate(`/outreach/sequences/${seq.id}/edit`)}
          >
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-t1 truncate">{seq.name}</h3>
                <span
                  className={cn(
                    "ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0",
                    seq.isActive ? "bg-green-900/30 text-green-400" : "bg-s600 text-t3",
                  )}
                >
                  {seq.isActive ? "Activ" : "Inactiv"}
                </span>
              </div>

              {seq.description && (
                <p className="mb-2 text-xs text-t3 line-clamp-2">{seq.description}</p>
              )}

              {seq.steps && seq.steps.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {seq.steps.map((step) => (
                    <span
                      key={step.id}
                      className="rounded bg-s700 px-2 py-0.5 text-xs text-t2"
                      title={`Pas ${step.stepNumber}: ${step.channel} (+${step.delayHours}h)`}
                    >
                      {step.stepNumber}. {step.channel}
                    </span>
                  ))}
                </div>
              )}

              <div className="mb-4 flex gap-4 text-xs text-t3">
                <span>{seq.totalEnrolled} înrolați</span>
                <span>{seq.totalCompletions} completări</span>
                <span>{seq.totalConversions} conv.</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={seq.isActive ? "danger" : "success"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggle(seq.id, seq.isActive);
                  }}
                >
                  {seq.isActive ? "Oprește" : "Activează"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/outreach/sequences/${seq.id}/edit`);
                  }}
                >
                  Editează
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <PageWrapper title="Sequences">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-t3">
          {sequences.length} secvențe{" "}
          <span className="text-green-400">
            ({sequences.filter((s) => s.isActive).length} active)
          </span>
        </p>
        <Button size="sm" onClick={() => navigate("/outreach/sequences/new")}>
          + Secvență Nouă
        </Button>
      </div>

      {listBody}
    </PageWrapper>
  );
}
