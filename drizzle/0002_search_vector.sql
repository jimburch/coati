ALTER TABLE "setups" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;--> statement-breakpoint
CREATE INDEX "setups_search_vector_idx" ON "setups" USING GIN ("search_vector");--> statement-breakpoint
CREATE INDEX "stars_created_at_idx" ON "stars" ("created_at");
