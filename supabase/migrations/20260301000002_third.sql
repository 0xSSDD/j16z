CREATE TABLE "ingestion_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"last_successful_sync" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"items_ingested" integer DEFAULT 0 NOT NULL,
	"is_healthy" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "ingestion_status_source_name_unique" UNIQUE("source_name")
);
--> statement-breakpoint
CREATE TABLE "rss_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"watchlist_id" uuid,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_error" text,
	"last_sync_at" timestamp with time zone,
	"item_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rss_feeds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rss_feeds" ADD CONSTRAINT "rss_feeds_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rss_feeds" ADD CONSTRAINT "rss_feeds_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "rss_feeds" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "rss_feeds" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "rss_feeds" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "rss_feeds" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));