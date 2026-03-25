-- Migration 0004: Add targetUserId and commentId to activities table
-- Needed for home feed display: followed_user shows target, commented links to specific comment

ALTER TABLE "activities" ADD COLUMN "target_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "comment_id" uuid REFERENCES "comments"("id") ON DELETE SET NULL;--> statement-breakpoint
