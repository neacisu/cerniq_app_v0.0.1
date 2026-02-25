ALTER TABLE "audit"."approval_audit_log" ADD COLUMN IF NOT EXISTS "source" varchar(50) NOT NULL DEFAULT 'api';
--> statement-breakpoint
