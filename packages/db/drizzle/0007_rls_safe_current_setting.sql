-- Safe RLS policies: use current_setting('app.tenant_id', true) to return NULL
-- instead of crashing when the GUC is not set.
-- Also re-creates get_user_by_email with SET row_security = off so it explicitly
-- bypasses RLS (requires BYPASSRLS on the function owner role).
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_isolation_users ON public.users FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_insert_users ON public.users FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_update_users ON public.users FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_delete_users ON public.users FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_isolation_roles ON public.roles FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_insert_roles ON public.roles FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_update_roles ON public.roles FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_delete_roles ON public.roles FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_isolation_user_roles ON public.user_roles FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_insert_user_roles ON public.user_roles FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_update_user_roles ON public.user_roles FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_delete_user_roles ON public.user_roles FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_isolation_approval_approval_tasks ON approval.approval_tasks FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_insert_approval_approval_tasks ON approval.approval_tasks FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_update_approval_approval_tasks ON approval.approval_tasks FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_delete_approval_approval_tasks ON approval.approval_tasks FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_isolation_approval_approval_type_configs ON approval.approval_type_configs FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_insert_approval_approval_type_configs ON approval.approval_type_configs FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_update_approval_approval_type_configs ON approval.approval_type_configs FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_delete_approval_approval_type_configs ON approval.approval_type_configs FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_isolation_audit_approval_audit_log ON audit.approval_audit_log FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_insert_audit_approval_audit_log ON audit.approval_audit_log FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_update_audit_approval_audit_log ON audit.approval_audit_log FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_delete_audit_approval_audit_log ON audit.approval_audit_log FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_user_by_email(p_email TEXT)
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT * FROM public.users WHERE email = p_email LIMIT 1;
$$;
