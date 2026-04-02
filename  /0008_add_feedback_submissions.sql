DO $$ BEGIN
  CREATE TYPE "feedback_category" AS ENUM ('bug', 'improvement', 'feature-request');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"category" "feedback_category" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"page_url" text NOT NULL,
	"github_issue_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_submissions_user_id_idx" ON "feedback_submissions" USING btree ("user_id");
