CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "digest_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"daily_enabled" boolean DEFAULT true NOT NULL,
	"weekly_enabled" boolean DEFAULT true NOT NULL,
	"suppress_weekend" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "digest_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memo_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memo_id" uuid NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"content" jsonb NOT NULL,
	"version" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memo_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "memos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_preferences" ADD CONSTRAINT "digest_preferences_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo_snapshots" ADD CONSTRAINT "memo_snapshots_memo_id_memos_id_fk" FOREIGN KEY ("memo_id") REFERENCES "public"."memos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo_snapshots" ADD CONSTRAINT "memo_snapshots_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "api_keys" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "api_keys" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "api_keys" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "api_keys" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "digest_preferences" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "digest_preferences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "digest_preferences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "digest_preferences" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "memo_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "memo_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "memo_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "memo_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "memos" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "memos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "memos" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "memos" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));