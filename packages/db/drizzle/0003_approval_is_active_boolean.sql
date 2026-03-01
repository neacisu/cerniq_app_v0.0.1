--> statement-breakpoint
ALTER TABLE approval.approval_type_configs ALTER COLUMN is_active DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE approval.approval_type_configs ALTER COLUMN is_active TYPE boolean USING (CASE WHEN is_active IN ('true','1','yes') THEN true ELSE false END);
--> statement-breakpoint
ALTER TABLE approval.approval_type_configs ALTER COLUMN is_active SET DEFAULT true;
