ALTER TABLE "setups" ADD COLUMN "display" varchar(150);--> statement-breakpoint
ALTER TABLE "setups" DROP COLUMN "search_vector";--> statement-breakpoint
ALTER TABLE "setups" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(display, '')), 'C')
  ) STORED;--> statement-breakpoint
CREATE INDEX "setups_search_vector_idx" ON "setups" USING GIN ("search_vector");
