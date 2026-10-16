ALTER TYPE "public"."exchange_rate_kind" ADD VALUE 'market';--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD COLUMN "market_rate" numeric(14, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD CONSTRAINT "purchase_trips_market_rate_check" CHECK ("purchase_trips"."market_rate" > 0);