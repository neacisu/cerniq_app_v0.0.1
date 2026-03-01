CREATE SCHEMA IF NOT EXISTS "bronze";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "silver";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "gold";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "approval";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "audit";
--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'escalated', 'expired');--> statement-breakpoint
CREATE TYPE "public"."approval_urgency" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'trial', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'manager', 'operator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending', 'locked');--> statement-breakpoint
CREATE TABLE "approval"."approval_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"urgency" "approval_urgency" DEFAULT 'medium' NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"ai_confidence" real,
	"ai_recommendation" varchar(20),
	"ai_reasoning" text,
	"requested_by" uuid NOT NULL,
	"assigned_to" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision" varchar(20),
	"decision_reason" text,
	"expires_at" timestamp with time zone,
	"etapa" varchar(10) NOT NULL,
	"priority" real DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval"."approval_type_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"etapa" varchar(10) NOT NULL,
	"auto_approve_threshold" real,
	"auto_reject_threshold" real,
	"requires_human_review" varchar(10) DEFAULT 'always' NOT NULL,
	"max_decision_time_hours" real DEFAULT 24,
	"escalation_time_hours" real DEFAULT 4,
	"escalate_to" varchar(20),
	"notify_on_create" varchar(200),
	"notify_on_decision" varchar(200),
	"is_active" varchar(5) DEFAULT 'true' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit"."approval_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"approval_task_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"performed_by" uuid,
	"performed_by_role" varchar(50),
	"previous_status" varchar(20),
	"new_status" varchar(20),
	"previous_data" jsonb,
	"new_data" jsonb,
	"reason" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"event_hash" varchar(64) NOT NULL,
	"previous_hash" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text,
	"name" varchar(200) NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;