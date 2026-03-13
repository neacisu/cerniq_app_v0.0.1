type DateRangeFilterProps = Readonly<{
  from?: string;
  to?: string;
  onChange: (next: { from?: string; to?: string }) => void;
}>;

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <label className="text-xs text-t3">
        <span>De la</span>
        <input
          type="date"
          className="mt-1 w-full rounded border border-s600 bg-s900 p-2 text-sm"
          value={from ?? ""}
          onChange={(e) => onChange({ from: e.target.value || undefined, to })}
        />
      </label>
      <label className="text-xs text-t3">
        <span>Pana la</span>
        <input
          type="date"
          className="mt-1 w-full rounded border border-s600 bg-s900 p-2 text-sm"
          value={to ?? ""}
          onChange={(e) => onChange({ from, to: e.target.value || undefined })}
        />
      </label>
    </div>
  );
}
