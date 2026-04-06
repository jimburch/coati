CREATE TABLE "setup_slug_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"old_slug" varchar(100) NOT NULL,
	"setup_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "setup_slug_redirects" ADD CONSTRAINT "setup_slug_redirects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_slug_redirects" ADD CONSTRAINT "setup_slug_redirects_setup_id_setups_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."setups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "setup_slug_redirects_user_id_old_slug_idx" ON "setup_slug_redirects" USING btree ("user_id","old_slug");--> statement-breakpoint
CREATE INDEX "setup_slug_redirects_setup_id_idx" ON "setup_slug_redirects" USING btree ("setup_id");
