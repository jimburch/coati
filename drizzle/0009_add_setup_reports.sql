DO $$ BEGIN
  CREATE TYPE "setup_report_reason" AS ENUM ('malicious', 'spam', 'inappropriate', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "setup_report_status" AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "setup_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setup_id" uuid NOT NULL REFERENCES "setups"("id") ON DELETE CASCADE,
	"reporter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"reason" "setup_report_reason" NOT NULL,
	"description" text,
	"status" "setup_report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "setup_reports_setup_id_reporter_id_idx" ON "setup_reports" USING btree ("setup_id","reporter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "setup_reports_setup_id_idx" ON "setup_reports" USING btree ("setup_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "setup_reports_status_idx" ON "setup_reports" USING btree ("status");
