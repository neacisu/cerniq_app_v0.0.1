import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { FileUpload } from "@/components/forms/FileUpload.js";
import { useUploadImport } from "@/hooks/use-etapa1.js";

export function ImportNew() {
  const uploadMutation = useUploadImport();
  const [message, setMessage] = useState("");

  return (
    <PageWrapper title="Import Nou">
      {uploadMutation.isError ? (
        <div className="mb-4 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la încărcarea fișierului: {uploadMutation.error?.message ?? "Eroare necunoscută"}
        </div>
      ) : null}
      <FileUpload
        multiple
        onFilesSelected={(files) => {
          void uploadMutation
            .mutateAsync({ file: files[0] })
            .then(() => setMessage(`Import creat: ${files[0].name}`));
        }}
      />
      {message ? <p className="mt-3 text-sm text-[var(--color-ok)]">{message}</p> : null}
    </PageWrapper>
  );
}
