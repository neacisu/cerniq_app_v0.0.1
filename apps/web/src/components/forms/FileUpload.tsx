import { useRef, useState, useId } from "react";
import { cn } from "@/lib/utils.js";
import { Button } from "@/components/ui/button.js";

type FileUploadProps = {
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  readonly onFilesSelected: (files: File[]) => void;
  readonly label?: string;
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
  const inputId = useId();

  const emitFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFilesSelected(Array.from(files));
  };

  return (
    <>
      {/* sr-only keeps the input in the a11y tree; htmlFor on the label makes
          keyboard activation (Enter/Space) and click both work natively. */}
      <input
        id={inputId}
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => emitFiles(e.target.files)}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "block rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          dragging ? "border-b5 bg-b5/5" : "border-s600 bg-s900/50",
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
        <p className="mb-4 text-sm text-t2">{label}</p>
        {/* type="button" prevents accidental form submission.
            Clicking this also activates the file input via the parent label. */}
        <Button
          variant="outline"
          disabled={disabled}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          Browse Files
        </Button>
      </label>
    </>
  );
}
