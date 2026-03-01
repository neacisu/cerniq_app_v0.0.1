import { useRef, useState } from "react";
import { cn } from "@/lib/utils.js";
import { Button } from "@/components/ui/button.js";

type FileUploadProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
  label?: string;
};

export function FileUpload({
  accept = ".csv,.xlsx,.xls",
  multiple = false,
  disabled = false,
  onFilesSelected,
  label = "Trage fisiere aici sau browse",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const emitFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFilesSelected(Array.from(files));
  };

  return (
    <>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => emitFiles(e.target.files)}
      />
      <div
        className={cn(
          "border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center transition-colors",
          dragging
            ? "border-[var(--color-b5)] bg-[var(--color-b5)]/5"
            : "border-[var(--color-s600)] bg-[var(--color-s900)]/50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) emitFiles(e.dataTransfer.files);
        }}
      >
        <p className="mb-4 text-sm text-[var(--color-t2)]">{label}</p>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => {
            inputRef.current?.click();
          }}
        >
          Browse Files
        </Button>
      </div>
    </>
  );
}
