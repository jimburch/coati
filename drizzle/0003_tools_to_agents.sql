-- Migration 0003: rename tools → agents, expand componentType enum, seed six official agents
-- Addresses issue #43

-- 1. Expand component_type enum with 5 new values (10 total)
ALTER TYPE "public"."component_type" ADD VALUE IF NOT EXISTS 'config';--> statement-breakpoint
ALTER TYPE "public"."component_type" ADD VALUE IF NOT EXISTS 'policy';--> statement-breakpoint
ALTER TYPE "public"."component_type" ADD VALUE IF NOT EXISTS 'agent_def';--> statement-breakpoint
ALTER TYPE "public"."component_type" ADD VALUE IF NOT EXISTS 'ignore';--> statement-breakpoint
ALTER TYPE "public"."component_type" ADD VALUE IF NOT EXISTS 'setup_script';--> statement-breakpoint

-- 2. Rename tools table to agents
ALTER TABLE "tools" RENAME TO "agents";--> statement-breakpoint

-- 3. Rename unique constraints on agents table
ALTER TABLE "agents" RENAME CONSTRAINT "tools_name_unique" TO "agents_display_name_unique";--> statement-breakpoint
ALTER TABLE "agents" RENAME CONSTRAINT "tools_slug_unique" TO "agents_slug_unique";--> statement-breakpoint

-- 4. Rename name column to display_name; add icon, website, official columns
ALTER TABLE "agents" RENAME COLUMN "name" TO "display_name";--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "official" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- 5. Rename setup_tools table to setup_agents
ALTER TABLE "setup_tools" RENAME TO "setup_agents";--> statement-breakpoint

-- 6. Rename tool_id column to agent_id in setup_agents
ALTER TABLE "setup_agents" RENAME COLUMN "tool_id" TO "agent_id";--> statement-breakpoint

-- 7. Rename index on setup_agents
ALTER INDEX "setup_tools_tool_id_idx" RENAME TO "setup_agents_agent_id_idx";--> statement-breakpoint

-- 8. Rename FK constraint on setup_agents.setup_id
ALTER TABLE "setup_agents" RENAME CONSTRAINT "setup_tools_setup_id_setups_id_fk" TO "setup_agents_setup_id_setups_id_fk";--> statement-breakpoint

-- 9. Replace FK constraint on setup_agents.agent_id (was tool_id → tools, now agent_id → agents)
ALTER TABLE "setup_agents" DROP CONSTRAINT "setup_tools_tool_id_tools_id_fk";--> statement-breakpoint
ALTER TABLE "setup_agents" ADD CONSTRAINT "setup_agents_agent_id_agents_id_fk"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint

-- 10. Rename primary key constraint on setup_agents
ALTER TABLE "setup_agents" RENAME CONSTRAINT "setup_tools_setup_id_tool_id_pk" TO "setup_agents_setup_id_agent_id_pk";--> statement-breakpoint

-- 11. Add nullable agent column to setup_files (FK to agents.slug; null = agent-agnostic/shared)
ALTER TABLE "setup_files" ADD COLUMN "agent" varchar(100);--> statement-breakpoint
ALTER TABLE "setup_files" ADD CONSTRAINT "setup_files_agent_agents_slug_fk"
    FOREIGN KEY ("agent") REFERENCES "agents"("slug") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint

-- 12. Seed six official agents
INSERT INTO "agents" ("slug", "display_name", "icon", "website", "official") VALUES
    ('claude-code', 'Claude Code', 'claude-code.svg', 'https://www.anthropic.com/claude-code', true),
    ('codex', 'Codex', 'codex.svg', 'https://openai.com/codex', true),
    ('copilot', 'GitHub Copilot', 'copilot.svg', 'https://github.com/features/copilot', true),
    ('cursor', 'Cursor', 'cursor.svg', 'https://cursor.com', true),
    ('gemini', 'Gemini CLI', 'gemini.svg', 'https://ai.google.dev', true),
    ('opencode', 'OpenCode', 'opencode.svg', 'https://opencode.ai', true)
ON CONFLICT ("slug") DO NOTHING;
