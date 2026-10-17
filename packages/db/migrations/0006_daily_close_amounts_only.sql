ALTER TABLE "daily_close_payments" DROP CONSTRAINT "daily_close_payments_amounts_check";--> statement-breakpoint
ALTER TABLE "daily_closes" DROP CONSTRAINT "daily_closes_rate_check";--> statement-breakpoint
ALTER TABLE "daily_closes" DROP CONSTRAINT "daily_closes_amounts_check";--> statement-breakpoint
ALTER TABLE "customer_credit_entries" DROP CONSTRAINT "customer_credit_entries_amounts_check";--> statement-breakpoint
ALTER TABLE "customer_credit_entries" DROP CONSTRAINT "customer_credit_entries_rate_check";--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_amounts_check";--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_rate_check";--> statement-breakpoint
ALTER TABLE "daily_close_payments" ALTER COLUMN "amount_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closes" ALTER COLUMN "rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closes" ALTER COLUMN "total_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closes" ALTER COLUMN "credit_sold_bs" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "daily_closes" ALTER COLUMN "credit_sold_bs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ALTER COLUMN "amount_bs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ALTER COLUMN "amount_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ALTER COLUMN "rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "amount_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "amount_bs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD COLUMN "card_batch" text;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ADD COLUMN "amount" numeric(14, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ADD COLUMN "currency" "currency" NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "concept" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "amount" numeric(14, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "currency" "currency" NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "daily_close_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_daily_close_id_daily_closes_id_fk" FOREIGN KEY ("daily_close_id") REFERENCES "public"."daily_closes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_closes_approved_by_idx" ON "daily_closes" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "expenses_daily_close_id_idx" ON "expenses" USING btree ("daily_close_id");--> statement-breakpoint
ALTER TABLE "daily_close_payments" ADD CONSTRAINT "daily_close_payments_amount_check" CHECK ("daily_close_payments"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_approval_check" CHECK (("daily_closes"."status" = 'approved') = ("daily_closes"."approved_by" IS NOT NULL AND "daily_closes"."approved_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ADD CONSTRAINT "customer_credit_entries_amount_check" CHECK ("customer_credit_entries"."amount" > 0);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount" > 0);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_concept_check" CHECK (length(trim("expenses"."concept")) > 0);