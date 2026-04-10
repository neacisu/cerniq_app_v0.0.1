/**
 * Teste pentru componentele plan ui-missing-e1-e2 (E1 pipeline + E2 outreach).
 * Acoperire țintă: 100% statements/branches/functions/lines pe cele 6 fișiere (vezi vitest.ui-missing-coverage.config.ts).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnrichmentProviderStatus } from "@/components/etapa1/EnrichmentProviderStatus.js";
import { DataQualityScorecard } from "@/components/etapa1/DataQualityScorecard.js";
import { DeduplicationReview } from "@/components/etapa1/DeduplicationReview.js";
import { CampaignAnalytics } from "@/components/outreach/analytics/CampaignAnalytics.js";
import { PhoneReputationDashboard } from "@/components/outreach/phones/PhoneReputationDashboard.js";
import { SequenceTimeline } from "@/components/outreach/sequences/SequenceTimeline.js";
import type { OutreachCampaign, SequenceStep, WaPhone } from "@/lib/etapa2-api.js";

function basePhone(over: Partial<WaPhone> = {}): WaPhone {
  return {
    id: "p1",
    tenantId: "t1",
    phoneNumber: "+40",
    label: "WA1",
    timelinesaiPhoneId: null,
    status: "ACTIVE",
    isEnabled: true,
    priority: 1,
    dailyQuotaLimit: 100,
    reputationScore: 0.85,
    lastHealthCheckAt: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    quotaPercentage: 20,
    currentUsage: 20,
    ...over,
  };
}

function analyticsRow(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    label: "WA1",
    phoneNumber: "+40",
    quotaUsed: 0.2,
    messagesSent: 50,
    repliesReceived: 5,
    replyRate: 0.1,
    avgResponseTime: 1,
    status: "ACTIVE",
    messagesDelivered: 48,
    bounces: 1,
    bounceRate: 5,
    ...over,
  };
}

describe("EnrichmentProviderStatus", () => {
  it("afișează gol fără cozi", () => {
    render(<EnrichmentProviderStatus queues={[]} />);
    expect(screen.getByText(/Nicio coadă returnată de API/i)).toBeInTheDocument();
  });

  it("randă rânduri din date API (activ, completed, concurrency, lastJobAt string, rateLimit obiect)", () => {
    render(
      <EnrichmentProviderStatus
        queues={[
          {
            name: "enrich.silver",
            paused: false,
            waiting: 2,
            active: 1,
            failed: 0,
            delayed: 0,
            completed: 10,
            concurrency: 4,
            rateLimit: { max: 100, duration: 60000 },
            lastJobAt: "2026-03-01T12:00:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("enrich.silver")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("pauză, completed/concurrency lipsă, lastJobAt non-string, rateLimit invalid, num() non-finite", () => {
    render(
      <EnrichmentProviderStatus
        queues={[
          {
            name: undefined,
            paused: true,
            waiting: "bad" as unknown as number,
            active: 1,
            failed: 0,
            delayed: 0,
            completed: undefined,
            concurrency: undefined,
            rateLimit: null,
            lastJobAt: 12345 as unknown as string,
          },
        ]}
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    const pauseBadge = screen
      .getAllByText(/^pauză$/i)
      .find((el) => (el as HTMLElement).className?.includes("badge"));
    expect(pauseBadge).toBeTruthy();
  });

  it("name non-primitiv (obiect) afișează em dash, fără [object Object]", () => {
    render(
      <EnrichmentProviderStatus
        queues={[
          {
            name: { bad: true } as unknown as string,
            paused: false,
            waiting: 0,
            active: 0,
            failed: 0,
            delayed: 0,
          },
        ]}
      />,
    );
    const cells = screen.getAllByRole("cell");
    const nameCell = cells.find((c) => c.textContent === "—");
    expect(nameCell).toBeTruthy();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });
});

describe("DataQualityScorecard", () => {
  it("afișează lead score când lipsesc scoruri metadata", () => {
    render(<DataQualityScorecard metadata={{}} leadScore={72} />);
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("metadata undefined se tratează ca obiect gol", () => {
    render(<DataQualityScorecard metadata={undefined} leadScore={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("citește dataQuality completitudine/accuracy/freshness", () => {
    render(
      <DataQualityScorecard
        metadata={{
          dataQuality: { completeness: 0.8, accuracy: 0.9, freshness: 0.7 },
        }}
      />,
    );
    expect(screen.getByText(/Completitudine/i)).toBeInTheDocument();
  });

  it("citește aliasuri completenessScore / accuracyScore / freshnessScore", () => {
    render(
      <DataQualityScorecard
        metadata={{
          dataQuality: { completenessScore: 0.4, accuracyScore: 0.5, freshnessScore: 0.6 },
        }}
      />,
    );
    expect(screen.getByText(/Completitudine/i)).toBeInTheDocument();
  });

  it("qualityScores N1–N3 (majuscule și minuscule) când dataQuality nu dă scoruri", () => {
    render(
      <DataQualityScorecard
        metadata={{
          dataQuality: {},
          qualityScores: { N1: 55, n2: 66, N3: 77 },
        }}
      />,
    );
    expect(screen.getByText(/Tier N1/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier N2/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier N3/i)).toBeInTheDocument();
  });

  it("qualityScores: doar cheie lowercase (fără majusculă) pentru tier", () => {
    render(<DataQualityScorecard metadata={{ qualityScores: { n1: 41, n2: 42, n3: 43 } }} />);
    expect(screen.getByText(/Tier N1/i)).toBeInTheDocument();
  });

  it("qualityScores: valoare N1 non-numerică este ignorată", () => {
    const { container } = render(
      <DataQualityScorecard metadata={{ qualityScores: { N1: "x" as unknown as number } }} />,
    );
    expect(container.textContent).not.toMatch(/Tier N1/);
  });

  it("n1Score / n2Score / n3Score când lipsesc celelalte surse (inclusiv clamp pentru valori >100 și <0)", () => {
    const { container } = render(
      <DataQualityScorecard
        metadata={{
          n1Score: Number.NaN,
          n2Score: 150,
          n3Score: -3,
        }}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("N1");
    expect(text).toContain("N2");
    expect(text).toContain("N3");
    expect(text).toContain("100%");
    expect(text).toContain("0%");
  });

  it("leadScore null sau NaN afișează em dash", () => {
    const { rerender } = render(<DataQualityScorecard metadata={{}} leadScore={null} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    rerender(<DataQualityScorecard metadata={{}} leadScore={Number.NaN} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("DeduplicationReview", () => {
  const candidate = {
    id: "d1",
    status: "pending",
    similarityScore: 92,
    companyAData: { denumire: "A SRL", cui: "1" },
    companyBData: { denumire: "B SRL", cui: "2" },
  };

  it("apelează onDecision la merge, skip și respinge", () => {
    const onDecision = vi.fn();
    render(<DeduplicationReview candidate={candidate} onDecision={onDecision} />);
    fireEvent.click(screen.getByRole("button", { name: /^Merge$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Skip$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Respinge$/i }));
    expect(onDecision).toHaveBeenCalledWith("d1", "merge");
    expect(onDecision).toHaveBeenCalledWith("d1", "skip");
    expect(onDecision).toHaveBeenCalledWith("d1", "reject");
  });

  it("hitl_pending: badge info și decizii permise", () => {
    const onDecision = vi.fn();
    render(
      <DeduplicationReview
        candidate={{ ...candidate, status: "hitl_pending" }}
        onDecision={onDecision}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Merge$/i }));
    expect(onDecision).toHaveBeenCalledWith("d1", "merge");
  });

  it("status rezolvat: butoane dezactivate", () => {
    render(
      <DeduplicationReview candidate={{ ...candidate, status: "merged" }} onDecision={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /^Merge$/i })).toBeDisabled();
  });

  it("disabled: butoane dezactivate", () => {
    render(<DeduplicationReview candidate={candidate} onDecision={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /^Merge$/i })).toBeDisabled();
  });

  it("alias leftCompany / rightCompany și câmpuri name, judetCod", () => {
    render(
      <DeduplicationReview
        candidate={{
          id: "x",
          leftCompany: { name: "Lft", cui: "11", judetCod: "BV" },
          rightCompany: { name: "Rgt", cui: "22", judet: "AB" },
          score: 80,
        }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText("Lft")).toBeInTheDocument();
    expect(screen.getByText("Rgt")).toBeInTheDocument();
    expect(screen.getByText(/BV/)).toBeInTheDocument();
  });

  it("companyAData / companyBData (fără left/right alias) și denumire prioritar față de name", () => {
    render(
      <DeduplicationReview
        candidate={{
          companyAData: { denumire: "DenumireA", cui: "C1" },
          companyBData: { name: "NameB", cui: "C2", judet: "TM" },
          similarityScore: 70,
        }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText("DenumireA")).toBeInTheDocument();
    expect(screen.getByText("NameB")).toBeInTheDocument();
  });

  it("fără id: string gol la onDecision; score ca alternativă la similarityScore", () => {
    const onDecision = vi.fn();
    render(
      <DeduplicationReview
        candidate={{ status: "pending", score: 55, companyAData: {}, companyBData: {} }}
        onDecision={onDecision}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Merge$/i }));
    expect(onDecision).toHaveBeenCalledWith("", "merge");
    expect(screen.getByText(/55%/)).toBeInTheDocument();
  });

  it("CUI/județ lipsă afișează em dash în detaliu", () => {
    render(
      <DeduplicationReview
        candidate={{
          id: "z",
          companyAData: {},
          companyBData: {},
          similarityScore: 1,
        }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/CUI: —/)).toHaveLength(2);
  });

  it("status non-pending non-hitl: fără decizie", () => {
    render(
      <DeduplicationReview candidate={{ ...candidate, status: "done" }} onDecision={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /^Merge$/i })).toBeDisabled();
  });

  it("companyAData null cade pe leftCompany; similarityScore prioritar față de score", () => {
    render(
      <DeduplicationReview
        candidate={{
          companyAData: null,
          leftCompany: { denumire: "FallbackL" },
          companyBData: { denumire: "B" },
          similarityScore: 99,
          score: 1,
        }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText("FallbackL")).toBeInTheDocument();
    expect(screen.getByText(/99%/)).toBeInTheDocument();
  });

  it("companyBData null cade pe rightCompany", () => {
    render(
      <DeduplicationReview
        candidate={{
          companyAData: { denumire: "A" },
          companyBData: null,
          rightCompany: { denumire: "FallbackR", cui: "9" },
          similarityScore: 50,
        }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText("FallbackR")).toBeInTheDocument();
  });

  it("fără companyBData în obiect: doar rightCompany", () => {
    render(
      <DeduplicationReview
        candidate={{
          companyAData: { denumire: "A" },
          rightCompany: { denumire: "DoarRight" },
          similarityScore: 10,
        }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText("DoarRight")).toBeInTheDocument();
  });

  it("similarityScore și score absente: scor 0", () => {
    render(
      <DeduplicationReview
        candidate={{ id: "z2", status: "pending", companyAData: {}, companyBData: {} }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it("similarityScore 0 nu cedează către score", () => {
    render(
      <DeduplicationReview
        candidate={{
          id: "z3",
          status: "pending",
          similarityScore: 0,
          score: 99,
          companyAData: {},
          companyBData: {},
        }}
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it("fără company fields: obiecte goale pentru left/right", () => {
    const { container } = render(
      <DeduplicationReview
        candidate={{ id: "e", status: "pending", similarityScore: 0 }}
        onDecision={vi.fn()}
      />,
    );
    expect((container.textContent ?? "").split("—").length).toBeGreaterThan(3);
  });
});

describe("CampaignAnalytics", () => {
  const campaign = (over: Partial<OutreachCampaign> = {}): OutreachCampaign => ({
    id: "c1",
    name: "Camp",
    status: "ACTIVE",
    sent: 100,
    opens: 40,
    replies: 10,
    bounces: 2,
    bounceRate: 2,
    ...over,
  });

  it("afișează rate-uri", () => {
    render(<CampaignAnalytics campaign={campaign()} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText(/Open rate/i)).toBeInTheDocument();
  });

  it("sent 0: open rate 0.0% (pct total<=0)", () => {
    render(<CampaignAnalytics campaign={campaign({ sent: 0, opens: 0, replies: 0 })} />);
    const els = screen.getAllByText("0.0%");
    expect(els.length).toBeGreaterThanOrEqual(2);
  });
});

describe("PhoneReputationDashboard", () => {
  it("randează fără analytics agregat", () => {
    render(<PhoneReputationDashboard phone={basePhone()} />);
    expect(screen.getByText(/0\.85/)).toBeInTheDocument();
    expect(screen.getByText(/Fără rând în PhoneAnalytics/i)).toBeInTheDocument();
  });

  it("header include analytics când phoneAnalytics e setat", () => {
    render(
      <PhoneReputationDashboard
        phone={basePhone()}
        phoneAnalytics={{ phones: [analyticsRow()] }}
      />,
    );
    expect(screen.getByText(/GET \/outreach\/analytics\/phones/i)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("BANNED: risc ridicat", () => {
    render(
      <PhoneReputationDashboard
        phone={basePhone({ status: "BANNED" })}
        phoneAnalytics={{ phones: [analyticsRow({ bounceRate: 5 })] }}
      />,
    );
    expect(screen.getByText(/BANNED/i)).toBeInTheDocument();
  });

  it("bounce rate foarte mare / moderat / cotă aproape plină / stabil", () => {
    const { rerender } = render(
      <PhoneReputationDashboard
        phone={basePhone({ quotaPercentage: 10 })}
        phoneAnalytics={{ phones: [analyticsRow({ bounceRate: 25 })] }}
      />,
    );
    expect(screen.getByText(/Bounce rate ridicat/i)).toBeInTheDocument();

    rerender(
      <PhoneReputationDashboard
        phone={basePhone({ quotaPercentage: 10 })}
        phoneAnalytics={{ phones: [analyticsRow({ bounceRate: 20 })] }}
      />,
    );
    expect(screen.getByText(/Bounce rate ridicat/i)).toBeInTheDocument();

    rerender(
      <PhoneReputationDashboard
        phone={basePhone({ quotaPercentage: 10 })}
        phoneAnalytics={{ phones: [analyticsRow({ bounceRate: 10 })] }}
      />,
    );
    expect(screen.getByText(/Bounce rate moderat/i)).toBeInTheDocument();

    rerender(
      <PhoneReputationDashboard
        phone={basePhone({ quotaPercentage: 10 })}
        phoneAnalytics={{ phones: [analyticsRow({ bounceRate: 8 })] }}
      />,
    );
    expect(screen.getByText(/Bounce rate moderat/i)).toBeInTheDocument();

    rerender(
      <PhoneReputationDashboard
        phone={basePhone({ quotaPercentage: 96, currentUsage: 96 })}
        phoneAnalytics={{ phones: [analyticsRow({ bounceRate: 3 })] }}
      />,
    );
    expect(screen.getByText(/Cotă aproape plină/i)).toBeInTheDocument();

    rerender(
      <PhoneReputationDashboard
        phone={basePhone({ quotaPercentage: 97, currentUsage: 10 })}
        phoneAnalytics={{ phones: [] }}
      />,
    );
    expect(screen.getByText(/Cotă aproape plină/i)).toBeInTheDocument();

    rerender(
      <PhoneReputationDashboard
        phone={basePhone({ quotaPercentage: 30 })}
        phoneAnalytics={{ phones: [analyticsRow({ bounceRate: 3 })] }}
      />,
    );
    expect(screen.getByText(/Profil stabil/i)).toBeInTheDocument();
  });

  it("currentUsage și quotaPercentage opționale afișează 0 implicit", () => {
    const p = basePhone();
    const { currentUsage: _c, quotaPercentage: _q, ...rest } = p;
    render(<PhoneReputationDashboard phone={rest} />);
    expect(screen.getByText(/0 \/ 100/)).toBeInTheDocument();
    expect(screen.getByText(/\(0%\)/)).toBeInTheDocument();
  });
});

describe("SequenceTimeline", () => {
  const step = (
    over: Partial<SequenceStep> & Pick<SequenceStep, "id" | "stepNumber">,
  ): SequenceStep => ({
    id: over.id,
    sequenceId: "seq",
    stepNumber: over.stepNumber,
    channel: over.channel ?? "WHATSAPP",
    templateId: over.templateId ?? "t1",
    delayHours: over.delayHours ?? 0,
    delayMinutes: over.delayMinutes ?? 30,
    subject: over.subject ?? null,
  });

  it("listează pașii, subiect, sort după stepNumber, condiție pe primul din doi", () => {
    const steps: SequenceStep[] = [
      step({
        id: "s2",
        stepNumber: 2,
        channel: "EMAIL_COLD",
        delayHours: 24,
        delayMinutes: 0,
        subject: "Hi",
      }),
      step({ id: "s1", stepNumber: 1, channel: "WHATSAPP", templateId: "tpl", delayMinutes: 30 }),
    ];
    render(<SequenceTimeline steps={steps} />);
    expect(screen.getByText(/Pas 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Pas 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Condiție implicită/i)).toBeInTheDocument();
    expect(screen.getByText(/Subiect: Hi/i)).toBeInTheDocument();
  });

  it("templateId null: fără template", () => {
    const one: SequenceStep = {
      id: "a1",
      sequenceId: "seq",
      stepNumber: 1,
      channel: "WHATSAPP",
      templateId: null,
      delayHours: 0,
      delayMinutes: 30,
      subject: null,
    };
    render(<SequenceTimeline steps={[one]} />);
    expect(screen.getByText(/fără template/i)).toBeInTheDocument();
  });

  it("steps undefined → empty state", () => {
    render(<SequenceTimeline steps={undefined} />);
    expect(screen.getByText(/Niciun pas/i)).toBeInTheDocument();
  });

  it("empty array", () => {
    render(<SequenceTimeline steps={[]} />);
    expect(screen.getByText(/Niciun pas/i)).toBeInTheDocument();
  });

  it("un singur pas: fără linie condiție implicită", () => {
    render(<SequenceTimeline steps={[step({ id: "only", stepNumber: 1 })]} />);
    expect(screen.queryByText(/Condiție implicită/i)).not.toBeInTheDocument();
  });
});
