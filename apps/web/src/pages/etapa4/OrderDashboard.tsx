/**
 * OrderDashboard — E4 Post-Sale Orders Kanban Board
 *
 * Kanban board cu 22 stări de comandă organizate în coloane
 * Vizualizare lifecycle: DRAFT → CONFIRMED → ... → PAID / COMPLETED
 * Plan: §XII L9479 — "lifecycle + payment + tracking live"
 * Workers: E4 payment, credit, logistics, contracts
 */
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { Package, CreditCard, Truck, CheckCircle2, Building2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PROFORMA_SENT"
  | "PROFORMA_PAID"
  | "CREDIT_APPROVED"
  | "CREDIT_PENDING"
  | "CREDIT_REJECTED"
  | "STOCK_RESERVED"
  | "IN_PRODUCTION"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "INVOICED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

type PaymentMethod = "BANK_TRANSFER" | "REVOLUT" | "CARD" | "COD" | "CREDIT";

interface Order {
  id: string;
  orderNumber: string;
  company: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  total: number;
  currency: string;
  carrier?: string;
  awb?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Kanban Columns ───────────────────────────────────────────────────────────

interface KanbanColumn {
  id: string;
  title: string;
  statuses: OrderStatus[];
  color: string;
  icon: React.ElementType;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "intake",
    title: "Intake",
    statuses: ["DRAFT", "CONFIRMED"],
    color: "var(--color-t4)",
    icon: Package,
  },
  {
    id: "financial",
    title: "Financiar",
    statuses: [
      "PROFORMA_SENT",
      "PROFORMA_PAID",
      "CREDIT_PENDING",
      "CREDIT_APPROVED",
      "CREDIT_REJECTED",
    ],
    color: "var(--color-neuron-credit)",
    icon: CreditCard,
  },
  {
    id: "fulfillment",
    title: "Fulfillment",
    statuses: ["STOCK_RESERVED", "IN_PRODUCTION", "READY_TO_SHIP"],
    color: "var(--color-b5)",
    icon: Package,
  },
  {
    id: "delivery",
    title: "Livrare",
    statuses: ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
    color: "var(--color-neuron-logistics)",
    icon: Truck,
  },
  {
    id: "closed",
    title: "Închis",
    statuses: ["INVOICED", "PAID", "OVERDUE", "CANCELLED"],
    color: "var(--color-ok)",
    icon: CheckCircle2,
  },
];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ORDERS: Order[] = [
  {
    id: "o-001",
    orderNumber: "ORD-2026-0001",
    company: "SC AgroSud SRL",
    status: "CONFIRMED",
    paymentMethod: "BANK_TRANSFER",
    total: 23401,
    currency: "RON",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-02",
  },
  {
    id: "o-002",
    orderNumber: "ORD-2026-0002",
    company: "Cooperativa Agriland",
    status: "CREDIT_APPROVED",
    paymentMethod: "CREDIT",
    total: 12000,
    currency: "RON",
    createdAt: "2026-03-30",
    updatedAt: "2026-04-01",
  },
  {
    id: "o-003",
    orderNumber: "ORD-2026-0003",
    company: "OUAI Ialomița Nord",
    status: "IN_TRANSIT",
    paymentMethod: "COD",
    total: 8200,
    currency: "RON",
    carrier: "SAMEDAY",
    awb: "AWB-2026-001234",
    createdAt: "2026-03-28",
    updatedAt: "2026-04-03",
  },
  {
    id: "o-004",
    orderNumber: "ORD-2026-0004",
    company: "SC Ferma Dunărea SA",
    status: "PAID",
    paymentMethod: "REVOLUT",
    total: 45000,
    currency: "RON",
    createdAt: "2026-03-20",
    updatedAt: "2026-03-30",
  },
  {
    id: "o-005",
    orderNumber: "ORD-2026-0005",
    company: "Agro Nord Impex SRL",
    status: "PROFORMA_SENT",
    paymentMethod: "BANK_TRANSFER",
    total: 16800,
    currency: "RON",
    createdAt: "2026-04-02",
    updatedAt: "2026-04-02",
  },
  {
    id: "o-006",
    orderNumber: "ORD-2026-0006",
    company: "Ferma Integrated SRL",
    status: "READY_TO_SHIP",
    paymentMethod: "BANK_TRANSFER",
    total: 9600,
    currency: "RON",
    carrier: "FAN_COURIER",
    createdAt: "2026-03-29",
    updatedAt: "2026-04-03",
  },
  {
    id: "o-007",
    orderNumber: "ORD-2026-0007",
    company: "Grup Agrar Trans SRL",
    status: "OVERDUE",
    paymentMethod: "BANK_TRANSFER",
    total: 31200,
    currency: "RON",
    createdAt: "2026-02-15",
    updatedAt: "2026-03-15",
  },
  {
    id: "o-008",
    orderNumber: "ORD-2026-0008",
    company: "Agro Plus SRL",
    status: "CONFIRMED",
    paymentMethod: "CARD",
    total: 5400,
    currency: "RON",
    createdAt: "2026-04-03",
    updatedAt: "2026-04-03",
  },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getOrderBorderColor(status: OrderStatus): string {
  if (status === "OVERDUE") return "var(--color-er)";
  if (status === "PAID") return "var(--color-ok)";
  return "var(--color-s700)";
}

function getStatusTextColor(isCurrent: boolean, isPast: boolean): string {
  if (isCurrent) return "var(--color-t1)";
  if (isPast) return "var(--color-t3)";
  return "var(--color-t4)";
}

const STATUS_SPECIAL_COLORS: Partial<Record<OrderStatus, string>> = {
  OVERDUE: "var(--color-er)",
  CANCELLED: "var(--color-er)",
  CREDIT_REJECTED: "var(--color-er)",
  PAID: "var(--color-ok)",
  DELIVERED: "var(--color-ok)",
};

function getDotColor(s: OrderStatus, isCurrent: boolean, isPast: boolean): string {
  if (isCurrent) return STATUS_SPECIAL_COLORS[s] ?? "var(--color-b5)";
  if (isPast) return "var(--color-ok)";
  return STATUS_SPECIAL_COLORS[s] ?? "var(--color-t4)";
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onSelect,
}: {
  readonly order: Order;
  readonly onSelect: (id: string) => void;
}) {
  const paymentMethodIcon: Record<PaymentMethod, string> = {
    BANK_TRANSFER: "🏦",
    REVOLUT: "💳",
    CARD: "💳",
    COD: "💵",
    CREDIT: "📋",
  };

  const borderColor = getOrderBorderColor(order.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "var(--color-s800)",
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        padding: "8px 10px",
        marginBottom: 6,
        cursor: "pointer",
        transition: "box-shadow 0.15s",
        fontFamily: "inherit",
        fontSize: "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px var(--color-b5)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--color-t3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {order.orderNumber}
        </div>
        <SBadge status={order.status} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <Building2 size={10} color="var(--color-t3)" />
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t1)" }}>
          {order.company}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-b5)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {order.currency} {order.total.toLocaleString()}
        </span>
        <span style={{ fontSize: 10, color: "var(--color-t3)" }}>
          {paymentMethodIcon[order.paymentMethod]} {order.paymentMethod.replaceAll("_", " ")}
        </span>
      </div>
      {!!order.carrier && !!order.awb && (
        <div
          style={{
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            color: "var(--color-neuron-logistics)",
          }}
        >
          <Truck size={9} />
          <span>
            {order.carrier} • {order.awb}
          </span>
        </div>
      )}
    </button>
  );
}

// ─── Order Detail Drawer ───────────────────────────────────────────────────────

const STATUS_FLOW: OrderStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "PROFORMA_SENT",
  "PROFORMA_PAID",
  "CREDIT_PENDING",
  "CREDIT_APPROVED",
  "CREDIT_REJECTED",
  "STOCK_RESERVED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "INVOICED",
  "PAID",
  "OVERDUE",
  "CANCELLED",
];

function OrderDetailPanel({
  order,
  onClose,
}: {
  readonly order: Order;
  readonly onClose: () => void;
}) {
  const currentIdx = STATUS_FLOW.indexOf(order.status);

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
          width: 380,
          background: "var(--color-s900)",
          borderLeft: "1px solid var(--color-s700)",
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-t1)" }}>
              {order.orderNumber}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-t3)" }}>{order.company}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-t3)",
              cursor: "pointer",
              fontSize: 18,
            }}
            aria-label="Închide"
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            fontSize: 11,
          }}
        >
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>STATUS</div>
            <SBadge status={order.status} />
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>VALOARE</div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--color-b5)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {order.currency} {order.total.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>
              METODĂ PLATĂ
            </div>
            <div style={{ color: "var(--color-t2)" }}>
              {order.paymentMethod.replaceAll("_", " ")}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>
              DATA CREARE
            </div>
            <div style={{ color: "var(--color-t2)" }}>{order.createdAt}</div>
          </div>
        </div>

        {!!order.awb && (
          <div
            style={{
              padding: "8px 12px",
              background: "color-mix(in oklch, var(--color-neuron-logistics) 10%, transparent)",
              borderRadius: 6,
              border:
                "1px solid color-mix(in oklch, var(--color-neuron-logistics) 30%, transparent)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--color-neuron-logistics)",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              <Truck size={10} style={{ display: "inline", marginRight: 4 }} />
              {order.carrier}
            </div>
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--color-t1)",
              }}
            >
              {order.awb}
            </div>
          </div>
        )}

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-t3)",
              marginBottom: 8,
            }}
          >
            PROGRES LIFECYCLE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {STATUS_FLOW.map((s, idx) => {
              const isPast = idx < currentIdx && currentIdx !== -1;
              const isCurrent = idx === currentIdx;
              const dotColor = getDotColor(s, isCurrent, isPast);
              const textColor = getStatusTextColor(isCurrent, isPast);

              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      color: textColor,
                      fontWeight: isCurrent ? 700 : 400,
                    }}
                  >
                    {s.replaceAll("_", " ")}
                  </div>
                  {isCurrent && (
                    <div
                      style={{
                        marginLeft: "auto",
                        fontSize: 9,
                        color: STATUS_SPECIAL_COLORS[s] ?? "var(--color-b5)",
                        fontWeight: 600,
                      }}
                    >
                      ← CURENT
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function OrderDashboard() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = selectedOrderId
    ? (MOCK_ORDERS.find((o) => o.id === selectedOrderId) ?? null)
    : null;

  const totalValue = MOCK_ORDERS.reduce((sum, o) => sum + o.total, 0);
  const overdueCount = MOCK_ORDERS.filter((o) => o.status === "OVERDUE").length;
  const paidCount = MOCK_ORDERS.filter((o) => o.status === "PAID").length;
  const activeCount = MOCK_ORDERS.filter(
    (o) => !["PAID", "CANCELLED", "OVERDUE"].includes(o.status),
  ).length;

  return (
    <>
      <PageWrapper
        title="Order Dashboard (Kanban)"
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <EtapaBadge label="Etapa 4" />
            <div
              style={{
                display: "flex",
                border: "1px solid var(--color-s700)",
                borderRadius: 4,
                overflow: "hidden",
                fontSize: 11,
              }}
            >
              {(["kanban", "list"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  style={{
                    padding: "3px 10px",
                    background: viewMode === m ? "var(--color-s700)" : "transparent",
                    border: "none",
                    color: viewMode === m ? "var(--color-t1)" : "var(--color-t3)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {m === "kanban" ? "Kanban" : "Tabel"}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
          <KpiCard
            label="Comenzi Active"
            value={String(activeCount)}
            icon="Package"
            color="var(--color-b5)"
          />
          <KpiCard
            label="Valoare Totală"
            value={`RON ${(totalValue / 1000).toFixed(0)}K`}
            icon="TrendingUp"
            color="var(--color-ok)"
          />
          <KpiCard
            label="Restanțe"
            value={String(overdueCount)}
            icon="AlertTriangle"
            color="var(--color-er)"
          />
          <KpiCard
            label="Plătite"
            value={String(paidCount)}
            icon="CheckCircle2"
            color="var(--color-ok)"
          />
        </div>

        {/* Kanban Board */}
        {viewMode === "kanban" ? (
          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 8,
              minHeight: 400,
            }}
          >
            {KANBAN_COLUMNS.map((col) => {
              const colOrders = MOCK_ORDERS.filter((o) => col.statuses.includes(o.status));
              const Icon = col.icon;

              return (
                <div
                  key={col.id}
                  style={{
                    minWidth: 220,
                    flex: "0 0 220px",
                    background: "var(--color-s900)",
                    borderRadius: 8,
                    padding: 10,
                    border: "1px solid var(--color-s800)",
                  }}
                >
                  {/* Column header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <Icon size={12} color={col.color} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: col.color }}>
                      {col.title}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "var(--color-s800)",
                        borderRadius: "50%",
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--color-t3)",
                      }}
                    >
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Cards */}
                  {colOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onSelect={setSelectedOrderId} />
                  ))}

                  {colOrders.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--color-t4)",
                        fontSize: 11,
                        paddingTop: 12,
                      }}
                    >
                      Fără comenzi
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-s700">
                    <th className="px-4 py-3 text-left font-medium text-t3">Comandă</th>
                    <th className="px-4 py-3 text-left font-medium text-t3">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-t3">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-t3">Valoare</th>
                    <th className="px-4 py-3 text-left font-medium text-t3">Plată</th>
                    <th className="px-4 py-3 text-left font-medium text-t3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ORDERS.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-s800 hover:bg-s800/50"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedOrderId(o.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-t3">{o.orderNumber}</td>
                      <td className="px-4 py-3 font-medium text-t1">{o.company}</td>
                      <td className="px-4 py-3">
                        <SBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-b5">
                        {o.currency} {o.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-t3">
                        {o.paymentMethod.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-xs text-t3">{o.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </PageWrapper>
      {selectedOrder !== null && (
        <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrderId(null)} />
      )}
    </>
  );
}
