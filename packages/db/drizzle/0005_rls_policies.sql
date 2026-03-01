--> statement-breakpoint
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_isolation_users ON public.users FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_insert_users ON public.users FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_update_users ON public.users FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_users ON public.users;
--> statement-breakpoint
CREATE POLICY tenant_delete_users ON public.users FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_isolation_roles ON public.roles FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_insert_roles ON public.roles FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_update_roles ON public.roles FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_roles ON public.roles;
--> statement-breakpoint
CREATE POLICY tenant_delete_roles ON public.roles FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_isolation_user_roles ON public.user_roles FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_insert_user_roles ON public.user_roles FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_update_user_roles ON public.user_roles FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_user_roles ON public.user_roles;
--> statement-breakpoint
CREATE POLICY tenant_delete_user_roles ON public.user_roles FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
ALTER TABLE approval.approval_tasks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE approval.approval_tasks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_isolation_approval_approval_tasks ON approval.approval_tasks FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_insert_approval_approval_tasks ON approval.approval_tasks FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_update_approval_approval_tasks ON approval.approval_tasks FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_approval_approval_tasks ON approval.approval_tasks;
--> statement-breakpoint
CREATE POLICY tenant_delete_approval_approval_tasks ON approval.approval_tasks FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
ALTER TABLE approval.approval_type_configs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE approval.approval_type_configs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_isolation_approval_approval_type_configs ON approval.approval_type_configs FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_insert_approval_approval_type_configs ON approval.approval_type_configs FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_update_approval_approval_type_configs ON approval.approval_type_configs FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_approval_approval_type_configs ON approval.approval_type_configs;
--> statement-breakpoint
CREATE POLICY tenant_delete_approval_approval_type_configs ON approval.approval_type_configs FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
ALTER TABLE audit.approval_audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit.approval_audit_log FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_isolation_audit_approval_audit_log ON audit.approval_audit_log FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_insert_audit_approval_audit_log ON audit.approval_audit_log FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_update_audit_approval_audit_log ON audit.approval_audit_log FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_audit_approval_audit_log ON audit.approval_audit_log;
--> statement-breakpoint
CREATE POLICY tenant_delete_audit_approval_audit_log ON audit.approval_audit_log FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::uuid);
