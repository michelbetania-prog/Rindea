-- Custom SQL migration file, put your code below! --
-- Application tables stay outside Supabase's public REST schema.
REVOKE ALL ON SCHEMA "biem" FROM PUBLIC;
--> statement-breakpoint
ALTER TABLE "biem"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."business_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."workspace_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."quote_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "biem"."audit_events" ENABLE ROW LEVEL SECURITY;
