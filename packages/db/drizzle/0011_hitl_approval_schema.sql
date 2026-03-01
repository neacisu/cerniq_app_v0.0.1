DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'approval_priority' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."approval_priority" AS ENUM('critical', 'high', 'normal', 'low');
  END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'approval_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."approval_type" AS ENUM(
      'dedup_review',
      'quality_review',
      'ai_structuring_review',
      'ai_merge_review',
      'low_confidence_review',
      'data_anomaly',
      'manual_verification',
      'error_review'
    );
  END IF;
END$$;
--> statement-breakpoint
ALTER TYPE "public"."approval_status" ADD VALUE IF NOT EXISTS 'assigned';
--> statement-breakpoint
ALTER TYPE "public"."approval_status" ADD VALUE IF NOT EXISTS 'cancelled';
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "approval_type" "public"."approval_type";
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "priority_level" "public"."approval_priority" NOT NULL DEFAULT 'normal';
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "pipeline_stage" varchar(10) NOT NULL DEFAULT 'E1';
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "decision_metadata" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "due_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "escalation_level" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "escalated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "escalated_to" uuid;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "blocked_job_id" varchar(100);
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ADD COLUMN IF NOT EXISTS "blocked_queue_name" varchar(100);
--> statement-breakpoint
UPDATE "approval"."approval_tasks"
SET "approval_type" = COALESCE(
  "approval_type",
  CASE
    WHEN "type" IN (
      'dedup_review',
      'quality_review',
      'ai_structuring_review',
      'ai_merge_review',
      'low_confidence_review',
      'data_anomaly',
      'manual_verification',
      'error_review'
    ) THEN "type"::"public"."approval_type"
    ELSE 'manual_verification'::"public"."approval_type"
  END
)
WHERE "approval_type" IS NULL;
--> statement-breakpoint
ALTER TABLE "approval"."approval_tasks" ALTER COLUMN "approval_type" SET NOT NULL;
--> statement-breakpoint
UPDATE "approval"."approval_tasks"
SET "due_at" = COALESCE("due_at", "expires_at", "created_at" + INTERVAL '24 hours')
WHERE "due_at" IS NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_tasks_created_by_users_id_fk') THEN
    ALTER TABLE "approval"."approval_tasks" ADD CONSTRAINT "approval_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_tasks_escalated_to_users_id_fk') THEN
    ALTER TABLE "approval"."approval_tasks" ADD CONSTRAINT "approval_tasks_escalated_to_users_id_fk" FOREIGN KEY ("escalated_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_approval_tasks_due_active"
ON "approval"."approval_tasks" ("tenant_id", "due_at")
WHERE "status" IN ('pending', 'assigned', 'escalated');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_approval_tasks_pipeline_type_status"
ON "approval"."approval_tasks" ("tenant_id", "pipeline_stage", "approval_type", "status");
