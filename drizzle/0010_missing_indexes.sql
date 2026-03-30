CREATE INDEX "comments_user_id_idx" ON "comments" ("user_id");
CREATE INDEX "setups_created_at_idx" ON "setups" ("created_at");
CREATE INDEX "setup_agents_setup_id_agent_id_idx" ON "setup_agents" ("setup_id", "agent_id");
CREATE INDEX "setup_tags_setup_id_tag_id_idx" ON "setup_tags" ("setup_id", "tag_id");
