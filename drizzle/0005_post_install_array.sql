-- Migration 0005: Change post_install from text to text[]
-- Wraps any existing string value into a single-element array

ALTER TABLE "setups" ALTER COLUMN "post_install" TYPE text[] USING CASE WHEN "post_install" IS NULL THEN NULL ELSE ARRAY["post_install"] END;--> statement-breakpoint
