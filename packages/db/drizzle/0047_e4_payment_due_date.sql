-- 0047_e4_payment_due_date.sql
-- FAZA 8c: Adaugă payment_due_at pe gold_orders pentru detecție restanțe (B11)
--
-- Motivație: B11 (payment:overdue:detect) necesită un câmp explicit pentru
-- data scadentă a plății. Nu se poate deduce din created_at deoarece termenii
-- de plată variază per client/contract (15, 30, 45, 60, 90 zile).
--
-- Default: created_at + INTERVAL '30 days' pentru comenzi existente (termen standard).
-- La creare comandă nouă: setat explicit de API sau default 30 zile.

ALTER TABLE gold.gold_orders
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ;
--> statement-breakpoint

-- Populează retroactiv cu default 30 zile de la creare pentru comenzi existente
-- în stări care pot fi overdue (INVOICED, PARTIALLY_PAID, OVERDUE)
UPDATE gold.gold_orders
  SET payment_due_at = created_at + INTERVAL '30 days'
  WHERE payment_due_at IS NULL
    AND status IN ('INVOICED', 'PARTIALLY_PAID', 'OVERDUE');
--> statement-breakpoint

-- Index pentru query-ul B11 (cron 0 9 * * *)
-- CONCURRENTLY = zero-downtime (fără lock pe tabelă)
-- Trebuie separat prin statement-breakpoint pentru a nu rula în tranzacție
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_orders_payment_due_at
  ON gold.gold_orders (tenant_id, payment_due_at)
  WHERE status IN ('INVOICED', 'PARTIALLY_PAID')
    AND deleted_at IS NULL;
