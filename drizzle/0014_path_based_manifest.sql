-- Migration: Replace source/target/per-file placement with path; add placement to setups
--
-- 1. Add placement column to setups (derive from per-file values during data migration)
-- 2. Migrate existing data: copy source→path, derive setup-level placement
-- 3. Rename source→path in setup_files, drop target and placement columns
-- 4. Rebuild placement enum without 'relative'

-- Step 1: Add placement column to setups (nullable first for data migration)
ALTER TABLE "setups" ADD COLUMN "placement" "placement";

-- Step 2: Derive setup-level placement from per-file placement values
-- Use 'global' if any file has 'global', otherwise 'project'
UPDATE "setups" s
SET "placement" = (
  SELECT
    CASE WHEN bool_or(sf."placement" = 'global') THEN 'global'::"placement" ELSE 'project'::"placement" END
  FROM "setup_files" sf
  WHERE sf."setup_id" = s."id"
)
WHERE EXISTS (SELECT 1 FROM "setup_files" sf WHERE sf."setup_id" = s."id");

-- Default to 'project' for setups with no files
UPDATE "setups" SET "placement" = 'project' WHERE "placement" IS NULL;

-- Make placement NOT NULL
ALTER TABLE "setups" ALTER COLUMN "placement" SET NOT NULL;
ALTER TABLE "setups" ALTER COLUMN "placement" SET DEFAULT 'project';

-- Step 3: Rename source → path in setup_files
ALTER TABLE "setup_files" RENAME COLUMN "source" TO "path";

-- Step 4: Drop target and placement columns from setup_files
ALTER TABLE "setup_files" DROP COLUMN "target";
ALTER TABLE "setup_files" DROP COLUMN "placement";

-- Step 5: Remove 'relative' from placement enum
-- PostgreSQL doesn't support removing enum values directly, so we recreate the type
CREATE TYPE "placement_new" AS ENUM ('global', 'project');
ALTER TABLE "setups" ALTER COLUMN "placement" TYPE "placement_new" USING "placement"::text::"placement_new";
DROP TYPE "placement";
ALTER TYPE "placement_new" RENAME TO "placement";
