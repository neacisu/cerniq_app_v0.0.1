-- Notificări aplicație (IN_APP + meta pentru EMAIL/WEBHOOK livrate prin dispatcher).
-- RLS: tenant + vizibilitate per utilizator (broadcast: user_id IS NULL).

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_tenant_created ON public.notifications (tenant_id, created_at DESC);

CREATE INDEX idx_notifications_tenant_user_created ON public.notifications (tenant_id, user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_tenant ON public.notifications;

CREATE POLICY notifications_select_tenant ON public.notifications
  FOR SELECT
  USING (
    tenant_id = public.cerniq_app_session_tenant_id()
    AND (
      user_id IS NULL
      OR user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

DROP POLICY IF EXISTS notifications_insert_tenant ON public.notifications;

CREATE POLICY notifications_insert_tenant ON public.notifications
  FOR INSERT
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

DROP POLICY IF EXISTS notifications_update_tenant ON public.notifications;

CREATE POLICY notifications_update_tenant ON public.notifications
  FOR UPDATE
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

DROP POLICY IF EXISTS notifications_delete_tenant ON public.notifications;

CREATE POLICY notifications_delete_tenant ON public.notifications
  FOR DELETE
  USING (tenant_id = public.cerniq_app_session_tenant_id());
