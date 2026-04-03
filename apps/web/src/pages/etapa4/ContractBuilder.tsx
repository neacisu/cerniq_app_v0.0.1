/**
 * ContractBuilder — E4 Contract Management with DocuSign
 *
 * Preview contract + sign status DocuSign
 * Clauses: standard + custom per tenant
 * Plan: §XII L9481 — "preview + sign status DocuSign"
 * Workers: G32-G36 (DocuSign integration)
 */
import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import {
  FileCheck,
  PenTool,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  Calendar,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "VOIDED" | "EXPIRED" | "COMPLETED";
type SignerStatus = "PENDING" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED";

interface ContractSigner {
  name: string;
  email: string;
  role: string;
  status: SignerStatus;
  signedAt?: string;
}

interface ContractClause {
  id: string;
  title: string;
  content: string;
  isCustom: boolean;
  isMandatory: boolean;
}

interface Contract {
  id: string;
  title: string;
  company: string;
  cui: string;
  status: ContractStatus;
  docuSignEnvelopeId?: string;
  createdAt: string;
  expiresAt: string;
  signers: ContractSigner[];
  clauses: ContractClause[];
  totalValue: number;
  currency: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CONTRACTS: Contract[] = [
  {
    id: "c-001",
    title: "Contract Furnizare Semințe 2026",
    company: "SC AgroSud SRL",
    cui: "12345678",
    status: "SENT",
    docuSignEnvelopeId: "DS-2026-ABCD1234",
    createdAt: "2026-04-01",
    expiresAt: "2026-04-15",
    totalValue: 23401,
    currency: "RON",
    signers: [
      { name: "Andrei Popescu", email: "andrei@agrosud.ro", role: "Client", status: "VIEWED" },
      {
        name: "Maria Ionescu",
        email: "maria@cerniq.ro",
        role: "Furnizor",
        status: "SIGNED",
        signedAt: "2026-04-01T10:30:00Z",
      },
    ],
    clauses: [
      {
        id: "cl-1",
        title: "Obiectul contractului",
        content: "Furnizarea de semințe certificate conform listei anexate.",
        isCustom: false,
        isMandatory: true,
      },
      {
        id: "cl-2",
        title: "Prețuri și plată",
        content: "Prețurile sunt conform ofertei acceptate. Plata în 30 de zile de la livrare.",
        isCustom: false,
        isMandatory: true,
      },
      {
        id: "cl-3",
        title: "Livrare și transport",
        content: "Livrarea se face franco depozit client cu SameDay Express.",
        isCustom: true,
        isMandatory: false,
      },
      {
        id: "cl-4",
        title: "Garanție și conformitate",
        content: "Semințele sunt garantate pentru rata de germinație ≥85%.",
        isCustom: false,
        isMandatory: true,
      },
      {
        id: "cl-5",
        title: "Penalități",
        content: "Întârziere plată: 0.1%/zi. Max 30 zile, după care contract reziliat.",
        isCustom: false,
        isMandatory: true,
      },
    ],
  },
  {
    id: "c-002",
    title: "Contract Cadru Produse Fitosanitare",
    company: "Cooperativa Agriland",
    cui: "87654321",
    status: "COMPLETED",
    docuSignEnvelopeId: "DS-2026-EFGH5678",
    createdAt: "2026-03-15",
    expiresAt: "2027-03-15",
    totalValue: 48000,
    currency: "RON",
    signers: [
      {
        name: "Ion Mihai",
        email: "ion@agriland.ro",
        role: "Client",
        status: "SIGNED",
        signedAt: "2026-03-17T14:00:00Z",
      },
      {
        name: "Elena Dumitrescu",
        email: "elena@cerniq.ro",
        role: "Furnizor",
        status: "SIGNED",
        signedAt: "2026-03-15T09:00:00Z",
      },
    ],
    clauses: [
      {
        id: "cl-1",
        title: "Obiectul contractului",
        content: "Contract cadru pentru achiziția produselor fitosanitare pe 12 luni.",
        isCustom: false,
        isMandatory: true,
      },
      {
        id: "cl-2",
        title: "Volumele estimate",
        content: "Minim 50.000 EUR anual, cu comandă minimă de 2.000 EUR.",
        isCustom: true,
        isMandatory: false,
      },
      {
        id: "cl-3",
        title: "Discount volume",
        content: "Discount automat 5% la volum >10K EUR/lună.",
        isCustom: true,
        isMandatory: false,
      },
    ],
  },
  {
    id: "c-003",
    title: "Contract Livrare Urgentă Fungicide",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    status: "EXPIRED",
    docuSignEnvelopeId: "DS-2026-IJKL9012",
    createdAt: "2026-03-01",
    expiresAt: "2026-03-15",
    totalValue: 8200,
    currency: "RON",
    signers: [
      {
        name: "Vasile Gheorghe",
        email: "vasile@ouai-ialomita.ro",
        role: "Client",
        status: "DECLINED",
      },
      {
        name: "Mihai Stancu",
        email: "mihai@cerniq.ro",
        role: "Furnizor",
        status: "SIGNED",
        signedAt: "2026-03-01T08:00:00Z",
      },
    ],
    clauses: [
      {
        id: "cl-1",
        title: "Obiectul contractului",
        content: "Livrare urgentă fungicide certificare UE.",
        isCustom: false,
        isMandatory: true,
      },
    ],
  },
];

/** Fallback când `selectedId` nu se potrivește cu niciun mock — catalogul mock trebuie să fie nevid. */
const FIRST_MOCK_CONTRACT: Contract = (() => {
  const first = MOCK_CONTRACTS[0];
  if (first == null) {
    throw new Error("ContractBuilder: MOCK_CONTRACTS trebuie să conțină cel puțin un contract.");
  }
  return first;
})();

// ─── Status helpers ───────────────────────────────────────────────────────────

function contractStatusColor(status: ContractStatus): string {
  const map: Record<ContractStatus, string> = {
    DRAFT: "var(--color-t4)",
    SENT: "var(--color-in)",
    VIEWED: "var(--color-wa)",
    SIGNED: "var(--color-ok)",
    VOIDED: "var(--color-er)",
    EXPIRED: "var(--color-er)",
    COMPLETED: "var(--color-ok)",
  };
  return map[status];
}

function signerStatusIcon(status: SignerStatus) {
  const map: Record<SignerStatus, React.ElementType> = {
    PENDING: Clock,
    SENT: Clock,
    VIEWED: AlertTriangle,
    SIGNED: CheckCircle2,
    DECLINED: XCircle,
  };
  return map[status];
}

// ─── Contract Card ────────────────────────────────────────────────────────────

interface ContractListItemProps {
  readonly contract: Contract;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function ContractListItem({ contract, selected, onSelect }: ContractListItemProps) {
  const color = contractStatusColor(contract.status);
  return (
    <Card
      className={cn("cursor-pointer transition-all", selected && "border-b5")}
      onClick={onSelect}
      style={{ borderColor: selected ? "var(--color-b5)" : undefined }}
    >
      <CardBody className="py-3 px-4">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-t1)" }}>
            {contract.title}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color,
              fontWeight: 600,
              border: `1px solid ${color}`,
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            {contract.status}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-t3)", marginBottom: 4 }}>
          <Building2 size={9} style={{ marginRight: 3 }} />
          {contract.company}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--color-t4)",
          }}
        >
          <span>RON {contract.totalValue.toLocaleString()}</span>
          <span>Exp: {contract.expiresAt}</span>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ContractBuilder() {
  const [selectedId, setSelectedId] = useState<string>("c-001");
  const [expandedClause, setExpandedClause] = useState<string | null>(null);

  const selected = MOCK_CONTRACTS.find((c) => c.id === selectedId) ?? FIRST_MOCK_CONTRACT;

  const signedCount = MOCK_CONTRACTS.filter(
    (c) => c.status === "COMPLETED" || c.status === "SIGNED",
  ).length;
  const pendingCount = MOCK_CONTRACTS.filter((c) => ["SENT", "VIEWED"].includes(c.status)).length;
  const expiredCount = MOCK_CONTRACTS.filter((c) => c.status === "EXPIRED").length;

  function handleDownloadPdf() {
    toast.success(`PDF contract ${selected.title} — descărcare simulată (mock).`);
  }

  function handleSendReminder() {
    const pendingSigners = selected.signers.filter(
      (s) => !["SIGNED", "DECLINED"].includes(s.status),
    );
    toast.success(
      `Reminder trimis către ${pendingSigners.length} semnatari pentru „${selected.title}".`,
    );
  }

  const allSigned = selected.signers.every((s) => s.status === "SIGNED");
  const hasPending = selected.signers.some((s) => ["PENDING", "SENT", "VIEWED"].includes(s.status));

  return (
    <PageWrapper title="Contract Builder" actions={<EtapaBadge label="Etapa 4" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total Contracte"
          value={String(MOCK_CONTRACTS.length)}
          icon="FileCheck"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Semnate"
          value={String(signedCount)}
          icon="CheckCircle2"
          color="var(--color-ok)"
        />
        <KpiCard
          label="Așteptare Semnare"
          value={String(pendingCount)}
          icon="Clock"
          color="var(--color-wa)"
        />
        <KpiCard
          label="Expirate"
          value={String(expiredCount)}
          icon="XCircle"
          color="var(--color-er)"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        {/* Contract list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-t3)",
              letterSpacing: "0.05em",
            }}
          >
            CONTRACTE
          </div>
          {MOCK_CONTRACTS.map((c) => (
            <ContractListItem
              key={c.id}
              contract={c}
              selected={selectedId === c.id}
              onSelect={() => setSelectedId(c.id)}
            />
          ))}
        </div>

        {/* Contract detail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Header */}
          <Card>
            <CardBody className="py-4 px-5">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <FileCheck size={18} color="var(--color-neuron-contract)" />
                    <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-t1)" }}>
                      {selected.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-t3)" }}>
                    <Building2 size={10} style={{ marginRight: 4 }} />
                    {selected.company} • CUI: {selected.cui}
                  </div>
                  {selected.docuSignEnvelopeId && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--color-t4)",
                        fontFamily: "var(--font-mono)",
                        marginTop: 2,
                      }}
                    >
                      DocuSign: {selected.docuSignEnvelopeId}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Button
                    variant="outline"
                    size="sm"
                    style={{ gap: 4, fontSize: 11 }}
                    onClick={handleDownloadPdf}
                  >
                    <Download size={12} />
                    PDF
                  </Button>
                  {hasPending && (
                    <Button size="sm" style={{ gap: 4, fontSize: 11 }} onClick={handleSendReminder}>
                      <PenTool size={12} />
                      Trimite Reminder
                    </Button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--color-t3)" }}>
                <span>
                  <Calendar size={10} style={{ marginRight: 3 }} />
                  Creat: {selected.createdAt}
                </span>
                <span>Expiră: {selected.expiresAt}</span>
                <span>
                  RON{" "}
                  <strong style={{ color: "var(--color-b5)" }}>
                    {selected.totalValue.toLocaleString()}
                  </strong>
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Signers status */}
          <Card>
            <CardHeader>
              <CardTitle>Status Semnare — DocuSign</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.signers.map((signer) => {
                  const Icon = signerStatusIcon(signer.status);
                  const colors: Record<SignerStatus, string> = {
                    PENDING: "var(--color-t4)",
                    SENT: "var(--color-in)",
                    VIEWED: "var(--color-wa)",
                    SIGNED: "var(--color-ok)",
                    DECLINED: "var(--color-er)",
                  };
                  const color = colors[signer.status];
                  const signerRowKey = `${signer.email}:${signer.role}:${signer.name}`;

                  return (
                    <div
                      key={signerRowKey}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        background: "var(--color-s800)",
                        borderRadius: 6,
                        border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: `color-mix(in oklch, ${color} 15%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <User size={14} color={color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-t1)" }}>
                          {signer.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--color-t3)" }}>
                          {signer.email} • {signer.role}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color }}>
                        <Icon size={14} color={color} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{signer.status}</span>
                      </div>
                      {signer.signedAt && (
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--color-t4)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {new Date(signer.signedAt).toLocaleString("ro-RO")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {allSigned && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "color-mix(in oklch, var(--color-ok) 10%, transparent)",
                    border: "1px solid color-mix(in oklch, var(--color-ok) 40%, transparent)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--color-ok)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} />
                  Contract complet semnat. Arhivat în fiscal_audit_trail cu hash SHA-256.
                </div>
              )}
            </CardBody>
          </Card>

          {/* Contract preview / clauses */}
          <Card>
            <CardHeader>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <CardTitle>Clauze Contract ({selected.clauses.length})</CardTitle>
                <div style={{ fontSize: 10, color: "var(--color-t3)" }}>
                  {selected.clauses.filter((c) => c.isCustom).length} personalizate •{" "}
                  {selected.clauses.filter((c) => c.isMandatory).length} obligatorii
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {selected.clauses.map((clause) => (
                <div
                  key={clause.id}
                  style={{
                    borderBottom: "1px solid var(--color-s800)",
                    padding: "10px 16px",
                  }}
                >
                  <button
                    type="button"
                    id={`clause-header-${clause.id}`}
                    aria-expanded={expandedClause === clause.id}
                    aria-controls={`clause-body-${clause.id}`}
                    onClick={() =>
                      setExpandedClause(expandedClause === clause.id ? null : clause.id)
                    }
                    style={{
                      display: "flex",
                      width: "100%",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      textAlign: "left",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-t1)" }}>
                        {clause.title}
                      </span>
                      {clause.isMandatory && (
                        <span
                          style={{
                            fontSize: 9,
                            color: "var(--color-er)",
                            border: "1px solid var(--color-er)",
                            padding: "1px 4px",
                            borderRadius: 3,
                          }}
                        >
                          OBLIGATORIU
                        </span>
                      )}
                      {clause.isCustom && (
                        <span
                          style={{
                            fontSize: 9,
                            color: "var(--color-b5)",
                            border: "1px solid var(--color-b5)",
                            padding: "1px 4px",
                            borderRadius: 3,
                          }}
                        >
                          PERSONALIZAT
                        </span>
                      )}
                    </div>
                    {expandedClause === clause.id ? (
                      <ChevronUp size={14} color="var(--color-t3)" />
                    ) : (
                      <ChevronDown size={14} color="var(--color-t3)" />
                    )}
                  </button>
                  {expandedClause === clause.id && (
                    <section
                      id={`clause-body-${clause.id}`}
                      aria-labelledby={`clause-header-${clause.id}`}
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "var(--color-t2)",
                        lineHeight: 1.6,
                      }}
                    >
                      {clause.content}
                    </section>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
