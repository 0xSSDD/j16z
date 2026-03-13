CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"alert_rule_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notification_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "webhook_secret" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "exchange_ratio" numeric;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_alert_rule_id_alert_rules_id_fk" FOREIGN KEY ("alert_rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "firm_isolation_select" ON "notification_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_insert" ON "notification_log" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_update" ON "notification_log" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)) WITH CHECK (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));--> statement-breakpoint
CREATE POLICY "firm_isolation_delete" ON "notification_log" AS PERMISSIVE FOR DELETE TO "authenticated" USING (firm_id = (select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid));