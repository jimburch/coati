-- Step 1: Add placement column to setups (nullable first for data migration)
ALTER TABLE "setups" ADD COLUMN "placement" "placement";--> statement-breakpoint

-- Step 2: Derive setup-level placement from per-file placement values
UPDATE "setups" s
SET "placement" = (
  SELECT
    CASE WHEN bool_or(sf."placement" = 'global') THEN 'global'::"placement" ELSE 'project'::"placement" END
  FROM "setup_files" sf
  WHERE sf."setup_id" = s."id"
)
WHERE EXISTS (SELECT 1 FROM "setup_files" sf WHERE sf."setup_id" = s."id");--> statement-breakpoint

UPDATE "setups" SET "placement" = 'project' WHERE "placement" IS NULL;--> statement-breakpoint

ALTER TABLE "setups" ALTER COLUMN "placement" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "setups" ALTER COLUMN "placement" SET DEFAULT 'project';--> statement-breakpoint

-- Step 3: Rename source to path in setup_files
ALTER TABLE "setup_files" RENAME COLUMN "source" TO "path";--> statement-breakpoint

-- Step 4: Drop target and placement columns from setup_files
ALTER TABLE "setup_files" DROP COLUMN "target";--> statement-breakpoint
ALTER TABLE "setup_files" DROP COLUMN "placement";--> statement-breakpoint

-- Step 5: Remove 'relative' from placement enum
ALTER TABLE "setups" ALTER COLUMN "placement" DROP DEFAULT;--> statement-breakpoint
CREATE TYPE "placement_new" AS ENUM ('global', 'project');--> statement-breakpoint
ALTER TABLE "setups" ALTER COLUMN "placement" TYPE "placement_new" USING "placement"::text::"placement_new";--> statement-breakpoint
DROP TYPE "placement";--> statement-breakpoint
ALTER TYPE "placement_new" RENAME TO "placement";--> statement-breakpoint
ALTER TABLE "setups" ALTER COLUMN "placement" SET DEFAULT 'project';
