CREATE TYPE "public"."category" AS ENUM('web-dev', 'mobile', 'data-science', 'devops', 'systems', 'general');--> statement-breakpoint
CREATE TYPE "public"."component_type" AS ENUM('instruction', 'command', 'skill', 'mcp_server', 'hook');--> statement-breakpoint
ALTER TABLE "setup_files" ADD COLUMN "component_type" "component_type" DEFAULT 'instruction' NOT NULL;--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN "category" "category";--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN "license" varchar(50);--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN "min_tool_version" varchar(20);--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN "post_install" text;--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN "prerequisites" text[];