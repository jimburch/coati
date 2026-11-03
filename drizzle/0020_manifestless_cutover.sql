-- Manifest-less cutover (#405, spec #402 §1–§2).
-- Deletes every Setup and its dependents, then reshapes the setup tables on
-- empty data. Users, Teams, Team Members, follows, sessions and device-flow
-- state are kept. Step order matters.

-- 1. Setup Activity. Its FK is `set null`, so it would outlive the Setups.
DELETE FROM "activities"
WHERE "setup_id" IS NOT NULL
	OR "action_type" IN ('created_setup', 'starred_setup', 'commented', 'cloned_setup');--> statement-breakpoint

-- 2. Every Setup. The cascade covers setup_files, setup_tags, setup_agents,
--    stars, comments, setup_shares, setup_reports and setup_slug_redirects.
DELETE FROM "setups";--> statement-breakpoint

-- 3. Tags become create-on-first-use.
DELETE FROM "tags";--> statement-breakpoint

-- 4. Nobody owns a Setup any more.
UPDATE "users" SET "setups_count" = 0;--> statement-breakpoint

-- 5. Schema changes on empty tables.

-- 5a. setups: search vector references `name`, so it goes first.
DROP INDEX IF EXISTS "setups_search_vector_idx";--> statement-breakpoint
ALTER TABLE "setups" DROP COLUMN "search_vector";--> statement-breakpoint
ALTER TABLE "setups" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "setups" DROP COLUMN "min_tool_version";--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN "search_vector" tsvector
	GENERATED ALWAYS AS (
		setweight(to_tsvector('english', coalesce(slug, '')), 'A') ||
		setweight(to_tsvector('english', coalesce(display, '')), 'A') ||
		setweight(to_tsvector('english', coalesce(description, '')), 'B')
	) STORED;--> statement-breakpoint
CREATE INDEX "setups_search_vector_idx" ON "setups" USING gin ("search_vector");--> statement-breakpoint

-- 5b. Slug uniqueness by Setup path owner: the user for personal Setups, the Team for Team Setups.
DROP INDEX IF EXISTS "setups_user_id_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "setups_user_slug_idx" ON "setups" USING btree ("user_id", "slug") WHERE "team_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "setups_team_slug_idx" ON "setups" USING btree ("team_id", "slug") WHERE "team_id" IS NOT NULL;--> statement-breakpoint

-- 5c. Deleting a Team deletes its Setups (Decided while writing #2).
ALTER TABLE "setups" DROP CONSTRAINT "setups_team_id_teams_id_fk";--> statement-breakpoint
ALTER TABLE "setups" ADD CONSTRAINT "setups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 5d. setup_files: server-computed hash, one row per path, no default type.
ALTER TABLE "setup_files" ADD COLUMN "hash" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "setup_files" ALTER COLUMN "component_type" DROP DEFAULT;--> statement-breakpoint
CREATE UNIQUE INDEX "setup_files_setup_id_path_idx" ON "setup_files" USING btree ("setup_id", "path");--> statement-breakpoint

-- 5e. Revisions: each one stores its full path/hash set, kept forever.
CREATE TABLE "setup_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setup_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"repo_fingerprint" varchar(64),
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "setup_revisions" ADD CONSTRAINT "setup_revisions_setup_id_setups_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."setups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_revisions" ADD CONSTRAINT "setup_revisions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "setup_revisions_setup_id_number_idx" ON "setup_revisions" USING btree ("setup_id", "number");--> statement-breakpoint
CREATE INDEX "setup_revisions_repo_fingerprint_idx" ON "setup_revisions" USING btree ("repo_fingerprint");--> statement-breakpoint

CREATE TABLE "setup_revision_files" (
	"revision_id" uuid NOT NULL,
	"setup_id" uuid NOT NULL,
	"path" text NOT NULL,
	"hash" varchar(64) NOT NULL,
	CONSTRAINT "setup_revision_files_revision_id_path_pk" PRIMARY KEY ("revision_id", "path")
);--> statement-breakpoint
ALTER TABLE "setup_revision_files" ADD CONSTRAINT "setup_revision_files_revision_id_setup_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."setup_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_revision_files" ADD CONSTRAINT "setup_revision_files_setup_id_setups_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."setups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "setup_revision_files_setup_id_path_hash_idx" ON "setup_revision_files" USING btree ("setup_id", "path", "hash");--> statement-breakpoint

-- 5f. Clones: one row per authenticated user or anonymous key per Setup.
CREATE TABLE "setup_clones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setup_id" uuid NOT NULL,
	"user_id" uuid,
	"anon_key" varchar(64),
	"first_cloned_at" timestamp with time zone NOT NULL,
	"last_cloned_at" timestamp with time zone NOT NULL,
	CONSTRAINT "setup_clones_exactly_one_cloner" CHECK (("user_id" IS NULL) <> ("anon_key" IS NULL))
);--> statement-breakpoint
ALTER TABLE "setup_clones" ADD CONSTRAINT "setup_clones_setup_id_setups_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."setups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_clones" ADD CONSTRAINT "setup_clones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "setup_clones_setup_id_user_id_idx" ON "setup_clones" USING btree ("setup_id", "user_id") WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "setup_clones_setup_id_anon_key_idx" ON "setup_clones" USING btree ("setup_id", "anon_key") WHERE "anon_key" IS NOT NULL;--> statement-breakpoint

-- 5g. Slug redirects are keyed by the Setup path owner: a user or a Team.
ALTER TABLE "setup_slug_redirects" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "setup_slug_redirects" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "setup_slug_redirects" ADD CONSTRAINT "setup_slug_redirects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_slug_redirects" ADD CONSTRAINT "setup_slug_redirects_exactly_one_owner" CHECK (("user_id" IS NULL) <> ("team_id" IS NULL));--> statement-breakpoint
DROP INDEX IF EXISTS "setup_slug_redirects_user_id_old_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "setup_slug_redirects_user_id_old_slug_idx" ON "setup_slug_redirects" USING btree ("user_id", "old_slug") WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "setup_slug_redirects_team_id_old_slug_idx" ON "setup_slug_redirects" USING btree ("team_id", "old_slug") WHERE "team_id" IS NOT NULL;--> statement-breakpoint

-- 5h. New Agent (#399).
INSERT INTO "agents" ("slug", "display_name", "icon", "website", "official") VALUES
	('antigravity', 'Antigravity', 'antigravity.svg', 'https://antigravity.google', true)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint

-- 6. Trending holds no stale rows.
REFRESH MATERIALIZED VIEW "trending_setups_mv";
