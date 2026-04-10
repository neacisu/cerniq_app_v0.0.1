import { Navigate, useParams } from "react-router-dom";

/** Deep link `/brain/:batchId` → query `batch` (aceeași logică ca în App). */
export function BrainBatchRedirect() {
  const { batchId } = useParams<{ batchId: string }>();
  if (!batchId) return <Navigate to="/brain" replace />;
  return <Navigate to={`/brain?batch=${encodeURIComponent(batchId)}`} replace />;
}
