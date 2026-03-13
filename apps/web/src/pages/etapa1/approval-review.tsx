import { useParams } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/index.js";
import { useApprovalDetail, useDecideApproval } from "@/hooks/use-etapa1.js";
import { SLACountdown } from "@/components/data/SLACountdown.js";
import { toast } from "@/components/ui/toast-api.js";

export function ApprovalReview() {
  const { id } = useParams();
  const detailQuery = useApprovalDetail(id);
  const decideMutation = useDecideApproval();
  const task = detailQuery.data?.data ?? {};
  const entityData = detailQuery.data?.entityData ?? null;

  const decide = async (decision: "approve" | "reject" | "merge" | "skip") => {
    if (!id) return;
    await decideMutation.mutateAsync({ id, decision });
    toast.success(`Decizie salvata: ${decision}`);
    await detailQuery.refetch();
  };

  if (detailQuery.isPending) {
    return (
      <PageWrapper title="Approval Review">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageWrapper title="Approval Review">
        <div className="rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10 p-4 text-sm text-(--color-danger)">
          Eroare la încărcarea datelor: {detailQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Approval Review">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{String(task.title ?? task.approvalType ?? id ?? "Approval")}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Status</div>
              <div className="font-semibold text-t1">{String(task.status ?? "-")}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Type</div>
              <div className="font-semibold text-t1">{String(task.approvalType ?? "-")}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Priority</div>
              <div className="font-semibold text-t1">{String(task.priorityLevel ?? "-")}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">SLA</div>
              <div className="font-semibold text-t1">
                {task.dueAt ? <SLACountdown dueAt={String(task.dueAt)} /> : "-"}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Tabs defaultValue="task">
        <TabsList>
          <TabsTrigger value="task">Task</TabsTrigger>
          <TabsTrigger value="entity">Entity Context</TabsTrigger>
        </TabsList>
        <TabsContent value="task">
          <pre className="rounded border border-s700 p-3 text-xs text-t2">
            {JSON.stringify(task, null, 2)}
          </pre>
        </TabsContent>
        <TabsContent value="entity">
          <pre className="rounded border border-s700 p-3 text-xs text-t2">
            {JSON.stringify(entityData, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => decide("approve")} disabled={decideMutation.isPending}>
          Aproba
        </Button>
        <Button
          variant="danger"
          onClick={() => decide("reject")}
          disabled={decideMutation.isPending}
        >
          Respinge
        </Button>
        <Button
          variant="outline"
          onClick={() => decide("merge")}
          disabled={decideMutation.isPending}
        >
          Merge
        </Button>
        <Button variant="ghost" onClick={() => decide("skip")} disabled={decideMutation.isPending}>
          Skip
        </Button>
      </div>
    </PageWrapper>
  );
}
