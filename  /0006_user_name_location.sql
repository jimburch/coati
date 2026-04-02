-- Migration 0006: Add name and location columns to users table

ALTER TABLE "users" ADD COLUMN "name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" varchar(100);
