-- Extend action_type enum with team-related actions
ALTER TYPE "public"."action_type" ADD VALUE IF NOT EXISTS 'created_team';--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE IF NOT EXISTS 'joined_team';--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE IF NOT EXISTS 'left_team';--> statement-breakpoint
ALTER TYPE "public"."action_type" ADD VALUE IF NOT EXISTS 'invited_to_team';--> statement-breakpoint

-- New enums
DO $$ BEGIN
  CREATE TYPE "public"."team_member_role" AS ENUM('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."team_invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."setup_visibility" AS ENUM('public', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- teams table
CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" varchar(300),
	"avatar_url" text,
	"owner_id" uuid NOT NULL,
	"members_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_slug_idx" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_owner_id_idx" ON "teams" USING btree ("owner_id");--> statement-breakpoint

-- Changes to setups table
ALTER TABLE "setups" ADD COLUMN IF NOT EXISTS "visibility" "setup_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN IF NOT EXISTS "team_id" uuid;--> statement-breakpoint
ALTER TABLE "setups" ADD CONSTRAINT "setups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Changes to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_beta_features" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Changes to activities table
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "team_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- team_members table
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_team_id_user_id_idx" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint

-- team_invites table
CREATE TABLE IF NOT EXISTS "team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"invited_by_user_id" uuid,
	"invited_user_id" uuid,
	"email" text,
	"token" text NOT NULL,
	"status" "team_invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_token_idx" ON "team_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invites_team_id_idx" ON "team_invites" USING btree ("team_id");--> statement-breakpoint

-- setup_shares table
CREATE TABLE IF NOT EXISTS "setup_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setup_id" uuid NOT NULL,
	"shared_with_user_id" uuid NOT NULL,
	"shared_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "setup_shares" ADD CONSTRAINT "setup_shares_setup_id_setups_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."setups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_shares" ADD CONSTRAINT "setup_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_shares" ADD CONSTRAINT "setup_shares_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "setup_shares_setup_id_shared_with_user_id_idx" ON "setup_shares" USING btree ("setup_id","shared_with_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "setup_shares_shared_with_user_id_idx" ON "setup_shares" USING btree ("shared_with_user_id");
