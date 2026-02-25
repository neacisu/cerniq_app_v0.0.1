--> statement-breakpoint
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
--> statement-breakpoint
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS users_updated_at ON users;
--> statement-breakpoint
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS approval_tasks_updated_at ON approval.approval_tasks;
--> statement-breakpoint
CREATE TRIGGER approval_tasks_updated_at
  BEFORE UPDATE ON approval.approval_tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
