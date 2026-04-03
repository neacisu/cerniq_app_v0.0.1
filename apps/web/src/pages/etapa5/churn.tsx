import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { Badge, Button } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";
import { X, TrendingDown, Phone, Mail, AlertTriangle } from "lucide-react";

interface ChurnProfile {
  company: string;
  cui: string;
  risk: number;
  severity: "high" | "medium" | "low";
  signals: string[];
  action: string;
  lastOrder: string;
  totalRevenue: string;
  nps: number;
  contact: string;
  contactEmail: string;
}

const profiles: ChurnProfile[] = [
  {
    company: "Cooperativa Agriland",
    cui: "87654321",
    risk: 72,
    severity: "high",
    signals: ["Fără comandă 90 zile", "NPS scăzut (42)", "Ticket deschis nerezolvat"],
    action: "Win-back urgent cu ofertă personalizată -20%",
    lastOrder: "2025-12-15",
    totalRevenue: "EUR 84K",
    nps: 42,
    contact: "Ion Mihai",
    contactEmail: "ion@agriland.ro",
  },
  {
    company: "SC AgroTech Nord",
    cui: "33445566",
    risk: 45,
    severity: "medium",
    signals: ["Ticket suport nerezolvat", "Reducere frecvență comenzi"],
    action: "Apel follow-up manager cont",
    lastOrder: "2026-02-10",
    totalRevenue: "EUR 32K",
    nps: 58,
    contact: "Andrei Vasile",
    contactEmail: "andrei@agrotech.ro",
  },
  {
    company: "OUAI Sud Giurgiu",
    cui: "22334455",
    risk: 22,
    severity: "low",
    signals: ["Întârziere plată 15 zile"],
    action: "Reminder plată + ofertă fidelizare",
    lastOrder: "2026-03-01",
    totalRevenue: "EUR 18K",
    nps: 71,
    contact: "Maria Popa",
    contactEmail: "maria@ouaisud.ro",
  },
];

const borderMap = { high: "border-er", medium: "border-wa", low: "border-ok" };
const riskColors = { high: "var(--color-er)", medium: "var(--color-wa)", low: "var(--color-ok)" };

function ChurnDetailDrawer({
  profile,
  onClose,
}: {
  readonly profile: ChurnProfile;
  readonly onClose: () => void;
}) {
  function handleWinBack() {
    toast.success(`Campanie win-back creată pentru ${profile.company}. Worker F32 declanșat.`);
    onClose();
  }
  function handleCall() {
    toast.info(`Apel programat cu ${profile.contact} (${profile.company}).`);
  }
  function handleEmail() {
    toast.info(`E-mail win-back trimis la ${profile.contactEmail}.`);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} aria-hidden />
      <div
        style={{
          width: 400,
          background: "var(--color-s900)",
          borderLeft: "1px solid var(--color-s700)",
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-t1)" }}>
              {profile.company}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)", fontFamily: "var(--font-mono)" }}>
              CUI: {profile.cui}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-t3)",
              cursor: "pointer",
            }}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingDown size={16} color={riskColors[profile.severity]} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              <span style={{ color: "var(--color-t3)" }}>Risc Churn</span>
              <span style={{ color: riskColors[profile.severity], fontWeight: 700 }}>
                {profile.risk}%
              </span>
            </div>
            <ProgressBar value={profile.risk} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>
              ULTIMA COMANDĂ
            </div>
            <div style={{ color: "var(--color-t2)" }}>{profile.lastOrder}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>
              VENIT TOTAL
            </div>
            <div style={{ color: "var(--color-b5)", fontWeight: 600 }}>{profile.totalRevenue}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>NPS</div>
            {(() => {
              let npsColor = "var(--color-er)";
              if (profile.nps > 60) {
                npsColor = "var(--color-ok)";
              } else if (profile.nps > 40) {
                npsColor = "var(--color-wa)";
              }
              return <div style={{ color: npsColor, fontWeight: 700 }}>{profile.nps}</div>;
            })()}
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CONTACT</div>
            <div style={{ color: "var(--color-t2)" }}>{profile.contact}</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t3)", marginBottom: 8 }}>
            SEMNALE RISC
          </div>
          {profile.signals.map((s) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                fontSize: 12,
                color: "var(--color-er)",
              }}
            >
              <AlertTriangle size={10} />
              {s}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: "color-mix(in oklch, var(--color-wa) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--color-wa) 30%, transparent)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--color-t2)",
          }}
        >
          <strong style={{ color: "var(--color-wa)" }}>Acțiune recomandată:</strong>{" "}
          {profile.action}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button size="sm" onClick={handleWinBack} style={{ gap: 6 }}>
            <TrendingDown size={13} /> Lansează Win-Back (F32)
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="outline" style={{ flex: 1, gap: 6 }} onClick={handleCall}>
              <Phone size={13} /> Sună
            </Button>
            <Button size="sm" variant="outline" style={{ flex: 1, gap: 6 }} onClick={handleEmail}>
              <Mail size={13} /> E-mail
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Churn() {
  const [selectedProfile, setSelectedProfile] = useState<ChurnProfile | null>(null);
  const highCount = profiles.filter((p) => p.severity === "high").length;

  return (
    <PageWrapper title="Churn Risk" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        <KpiCard
          label="La Risc"
          value={String(profiles.length)}
          icon="AlertTriangle"
          color="var(--color-er)"
        />
        <KpiCard
          label="Risc Critic"
          value={String(highCount)}
          icon="TrendingDown"
          color="var(--color-er)"
        />
        <KpiCard label="Win-Back Succes" value="23%" icon="TrendingUp" color="var(--color-ok)" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <Card key={p.company} className={cn("border-l-4", borderMap[p.severity])}>
            <CardBody className="space-y-3">
              <div className="font-semibold text-t1">{p.company}</div>
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <ProgressBar value={p.risk} />
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: riskColors[p.severity],
                  }}
                >
                  {p.risk}%
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.signals.map((s) => (
                  <Badge key={s} variant="error" className="text-[0.65rem]">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-t3">{p.action}</p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="brand"
                  className="flex-1"
                  onClick={() => {
                    toast.success(`Campanie win-back pentru ${p.company}. Worker F32 declanșat.`);
                  }}
                >
                  Win-Back
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedProfile(p)}
                >
                  Profil
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {selectedProfile && (
        <ChurnDetailDrawer profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}
    </PageWrapper>
  );
}
