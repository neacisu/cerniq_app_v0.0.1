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
        <div className="mb-4 rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea fișierului: {uploadMutation.error?.message ?? "Eroare necunoscută"}
        </div>
      ) : null}
      <FileUpload
        multiple
        onFilesSelected={async (files) => {
          await uploadMutation.mutateAsync({ file: files[0] });
          setMessage(`Import creat: ${files[0].name}`);
        }}
      />
      {message ? <p className="mt-3 text-sm text-ok">{message}</p> : null}
    </PageWrapper>
  );
}
