CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"deal_id" uuid,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"threshold" integer DEFAULT 50 NOT NULL,
	"channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"webhook_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "alert_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"changes" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"filing_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"verbatim_text" text NOT NULL,
	"source_location" text NOT NULL,
	"extracted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "clauses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid,
	"symbol" text NOT NULL,
	"acquirer" text NOT NULL,
	"target" text NOT NULL,
	"deal_value" numeric,
	"price_per_share" numeric,
	"premium" numeric,
	"current_price" numeric,
	"gross_spread" numeric,
	"annualized_return" numeric,
	"status" text DEFAULT 'ANNOUNCED' NOT NULL,
	"consideration_type" text DEFAULT 'CASH' NOT NULL,
	"announced_date" date,
	"expected_close_date" date,
	"outside_date" date,
	"p_close_base" numeric,
	"p_break_regulatory" numeric,
	"p_break_litigation" numeric,
	"regulatory_flags" text[] DEFAULT '{}'::text[],
	"litigation_count" integer DEFAULT 0 NOT NULL,
	"spread_entry_threshold" numeric,
	"size_bucket" text,
	"is_starter" boolean DEFAULT false NOT NULL,
	"acquirer_cik" text,
	"target_cik" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"deal_id" uuid,
	"type" text NOT NULL,
	"sub_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"materiality_score" integer DEFAULT 0 NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"accession_number" text NOT NULL,
	"filing_type" text NOT NULL,
	"filer_name" text,
	"filer_cik" text NOT NULL,
	"filed_date" date NOT NULL,
	"raw_url" text NOT NULL,
	"raw_content" text,
	"extracted" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "filings_accession_number_unique" UNIQUE("accession_number")
);
--> statement-breakpoint
CREATE TABLE "firm_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "firm_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"current_price" numeric NOT NULL,
	"target_price" numeric NOT NULL,
	"acquirer_price" numeric NOT NULL,
	"gross_spread" numeric NOT NULL,
	"annualized_return" numeric NOT NULL,
	"volume" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "market_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"deal_id" uuid,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "news_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watchlist_deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watchlist_deals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "watchlists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_filing_id_filings_id_fk" FOREIGN KEY ("filing_id") REFERENCES "public"."filings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_deals" ADD CONSTRAINT "watchlist_deals_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_deals" ADD CONSTRAINT "watchlist_deals_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "alert_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "alert_rules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "alert_rules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "alert_rules" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "audit_log" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "clauses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "clauses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "clauses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "clauses" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "deals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "deals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "deals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "deals" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "events" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "firm_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "firm_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "firm_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "firm_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "invites" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "invites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "invites" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "invites" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "market_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "market_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "market_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "market_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "news_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "news_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "news_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "news_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "watchlist_deals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from watchlists w
        where w.id = "watchlist_deals"."watchlist_id"
        and w.firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)
        and w.deleted_at is null
      ));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "watchlist_deals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (
        select 1 from watchlists w
        where w.id = watchlist_id
        and w.firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)
        and w.deleted_at is null
      ));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "watchlist_deals" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (
        select 1 from watchlists w
        where w.id = "watchlist_deals"."watchlist_id"
        and w.firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)
        and w.deleted_at is null
      ));--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "watchlists" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "watchlists" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "watchlists" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "watchlists" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));