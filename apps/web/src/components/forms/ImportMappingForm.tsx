import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button.js";
import type { SelectOption } from "@/components/ui/select.js";
import { SelectField } from "./SelectField.js";
import { InputField } from "./InputField.js";

export type ImportMappingConfig = {
  delimiter: "," | ";" | "\t";
  encoding: "utf-8" | "iso-8859-2";
  hasHeader: boolean;
  sheetName?: string;
  mappings: Record<string, string>;
};

type ImportMappingFormProps = {
  sourceColumns: string[];
  targetFields: SelectOption[];
  initial?: Partial<ImportMappingConfig>;
  onSubmit: (config: ImportMappingConfig) => Promise<void> | void;
};

export function ImportMappingForm({
  sourceColumns,
  targetFields,
  initial,
  onSubmit,
}: ImportMappingFormProps) {
  const [delimiter, setDelimiter] = useState<"," | ";" | "\t">(initial?.delimiter ?? ",");
  const [encoding, setEncoding] = useState<"utf-8" | "iso-8859-2">(initial?.encoding ?? "utf-8");
  const [sheetName, setSheetName] = useState(initial?.sheetName ?? "");
  const [mappings, setMappings] = useState<Record<string, string>>(initial?.mappings ?? {});
  const [hasHeader, setHasHeader] = useState(initial?.hasHeader ?? true);

  const mappingRows = useMemo(() => sourceColumns, [sourceColumns]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          delimiter,
          encoding,
          hasHeader,
          sheetName: sheetName || undefined,
          mappings,
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label="Delimiter"
          value={delimiter}
          onChange={(v) => setDelimiter(v as "," | ";" | "\t")}
          options={[
            { label: "Virgula (,)", value: "," },
            { label: "Punct si virgula (;)", value: ";" },
            { label: "Tab", value: "\t" },
          ]}
        />
        <SelectField
          label="Encoding"
          value={encoding}
          onChange={(v) => setEncoding(v as "utf-8" | "iso-8859-2")}
          options={[
            { label: "UTF-8", value: "utf-8" },
            { label: "ISO-8859-2", value: "iso-8859-2" },
          ]}
        />
      </div>
      <InputField label="Sheet name (Excel)" value={sheetName} onChange={setSheetName} />
      <label className="flex items-center gap-2 text-sm text-[var(--color-t2)]">
        <input
          type="checkbox"
          checked={hasHeader}
          onChange={(e) => setHasHeader(e.target.checked)}
        />
        Primul rand contine header
      </label>

      <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-s600)] p-3">
        <h4 className="text-sm font-semibold text-[var(--color-t1)]">Column mapping</h4>
        {mappingRows.map((sourceCol) => (
          <div key={sourceCol} className="grid gap-2 md:grid-cols-2">
            <div className="text-xs text-[var(--color-t3)]">{sourceCol}</div>
            <SelectField
              label=""
              value={mappings[sourceCol] ?? ""}
              onChange={(v) => setMappings((prev) => ({ ...prev, [sourceCol]: v }))}
              options={[{ label: "Ignora", value: "" }, ...targetFields]}
            />
          </div>
        ))}
      </div>

      <Button type="submit">Salveaza mapping</Button>
    </form>
  );
}
