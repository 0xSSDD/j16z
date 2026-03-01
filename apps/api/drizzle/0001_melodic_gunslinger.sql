ALTER TABLE "clauses" ADD COLUMN "confidence_score" numeric;--> statement-breakpoint
ALTER TABLE "clauses" ADD COLUMN "analyst_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "filings" ADD COLUMN "headline_summary" text;--> statement-breakpoint
ALTER TABLE "filings" ADD COLUMN "section_summary" text;