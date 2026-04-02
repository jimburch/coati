ALTER TABLE "users" ADD COLUMN "is_beta_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;
