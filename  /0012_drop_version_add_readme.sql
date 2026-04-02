ALTER TABLE "setups" DROP COLUMN "version";
ALTER TABLE "setups" DROP COLUMN "readme_path";
ALTER TABLE "setups" ADD COLUMN "readme" text;
