import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { InputField } from "./InputField.js";
import { CuiInputField } from "./CuiInputField.js";
import { PhoneInputField } from "./PhoneInputField.js";

export type ManualEntryPayload = {
  companyName: string;
  cui: string;
  email: string;
  phone: string;
  address: string;
};

type ManualEntryFormProps = {
  loading?: boolean;
  onSubmit: (payload: ManualEntryPayload) => Promise<void> | void;
};

export function ManualEntryForm({ loading, onSubmit }: ManualEntryFormProps) {
  const [form, setForm] = useState<ManualEntryPayload>({
    companyName: "",
    cui: "",
    email: "",
    phone: "",
    address: "",
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
    >
      <InputField
        label="Denumire companie"
        value={form.companyName}
        onChange={(v) => setForm((s) => ({ ...s, companyName: v }))}
        required
      />
      <CuiInputField
        value={form.cui}
        onChange={(v) => setForm((s) => ({ ...s, cui: v }))}
        required
      />
      <InputField
        label="Email"
        type="email"
        value={form.email}
        onChange={(v) => setForm((s) => ({ ...s, email: v }))}
      />
      <PhoneInputField value={form.phone} onChange={(v) => setForm((s) => ({ ...s, phone: v }))} />
      <InputField
        label="Adresa"
        value={form.address}
        onChange={(v) => setForm((s) => ({ ...s, address: v }))}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Se salveaza..." : "Adauga contact"}
      </Button>
    </form>
  );
}
