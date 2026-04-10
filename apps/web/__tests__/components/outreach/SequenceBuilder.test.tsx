import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SequenceBuilder } from "@/components/outreach/sequences/SequenceBuilder.js";
import type { OutreachTemplate } from "@/lib/etapa2-api.js";

const templates: OutreachTemplate[] = [
  {
    id: "tw",
    tenantId: "t",
    name: "Tpl WA",
    description: null,
    channel: "WHATSAPP",
    subject: null,
    bodyTemplate: "x",
    templateType: "INITIAL",
    status: "ACTIVE",
    variables: [],
    hasMedia: false,
    mediaType: null,
    mediaUrl: null,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "te",
    tenantId: "t",
    name: "Tpl Email",
    description: null,
    channel: "EMAIL",
    subject: "Sub",
    bodyTemplate: "y",
    templateType: "INITIAL",
    status: "ACTIVE",
    variables: [],
    hasMedia: false,
    mediaType: null,
    mediaUrl: null,
    createdAt: "",
    updatedAt: "",
  },
];

describe("SequenceBuilder", () => {
  it("+ Pas și mută / șterge apelează handler-ele", async () => {
    const user = userEvent.setup();
    const onAddStep = vi.fn();
    const onRemoveStep = vi.fn();
    const onMoveStep = vi.fn();
    const onUpdateStep = vi.fn();
    const steps = [
      {
        draftKey: "a",
        stepNumber: 1,
        channel: "WHATSAPP" as const,
        delayHours: 0,
        delayMinutes: 0,
        subject: "",
        templateId: "tw",
      },
      {
        draftKey: "b",
        stepNumber: 2,
        channel: "WHATSAPP" as const,
        delayHours: 1,
        delayMinutes: 0,
        subject: "",
        templateId: "tw",
      },
    ];
    render(
      <SequenceBuilder
        formIdPrefix="seq"
        steps={steps}
        templates={templates}
        onAddStep={onAddStep}
        onRemoveStep={onRemoveStep}
        onUpdateStep={onUpdateStep}
        onMoveStep={onMoveStep}
      />,
    );

    await user.click(screen.getByRole("button", { name: /\+ Pas/i }));
    expect(onAddStep).toHaveBeenCalled();

    await user.click(screen.getAllByRole("button", { name: "↑" })[1]);
    expect(onMoveStep).toHaveBeenCalledWith(1, -1);

    await user.click(screen.getAllByRole("button", { name: "↓" })[0]);
    expect(onMoveStep).toHaveBeenCalledWith(0, 1);

    await user.click(screen.getAllByRole("button", { name: /Șterge/i })[0]);
    expect(onRemoveStep).toHaveBeenCalled();
  });

  it("schimbă canalul la EMAIL și afișează câmp subiect + delay pentru pasul 2", async () => {
    const user = userEvent.setup();
    const onUpdateStep = vi.fn();
    const steps = [
      {
        draftKey: "a",
        stepNumber: 1,
        channel: "WHATSAPP" as const,
        delayHours: 0,
        delayMinutes: 0,
        subject: "",
        templateId: "tw",
      },
      {
        draftKey: "b",
        stepNumber: 2,
        channel: "EMAIL_COLD" as const,
        delayHours: 2,
        delayMinutes: 5,
        subject: "Hi",
        templateId: "te",
      },
    ];
    render(
      <SequenceBuilder
        formIdPrefix="f"
        steps={steps}
        templates={templates}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onUpdateStep={onUpdateStep}
        onMoveStep={vi.fn()}
      />,
    );

    expect(screen.getByText(/După pasul 1:/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subiect email/)).toHaveValue("Hi");

    const canalSelects = screen.getAllByLabelText(/^Canal$/);
    await user.selectOptions(canalSelects[canalSelects.length - 1], "EMAIL_WARM");
    expect(onUpdateStep).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ channel: "EMAIL_WARM" }),
    );
  });

  it("primul pas: delay imediat, fără câmpuri delay numerice", () => {
    const steps = [
      {
        draftKey: "a",
        stepNumber: 1,
        channel: "WHATSAPP" as const,
        delayHours: 0,
        delayMinutes: 0,
        subject: "",
        templateId: "tw",
      },
    ];
    render(
      <SequenceBuilder
        formIdPrefix="g"
        steps={steps}
        templates={templates}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onUpdateStep={vi.fn()}
        onMoveStep={vi.fn()}
      />,
    );
    expect(screen.getByText(/Start imediat după înrolare/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Delay ore/i)).not.toBeInTheDocument();
  });
});
