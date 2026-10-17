ALTER TABLE "daily_close_payments" DROP COLUMN "amount_usd";--> statement-breakpoint
ALTER TABLE "daily_closes" DROP COLUMN "rate";--> statement-breakpoint
ALTER TABLE "daily_closes" DROP COLUMN "total_usd";--> statement-breakpoint
ALTER TABLE "daily_closes" DROP COLUMN "credit_sold_bs";--> statement-breakpoint
ALTER TABLE "customer_credit_entries" DROP COLUMN "amount_bs";--> statement-breakpoint
ALTER TABLE "customer_credit_entries" DROP COLUMN "amount_usd";--> statement-breakpoint
ALTER TABLE "customer_credit_entries" DROP COLUMN "rate";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "amount_usd";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "amount_bs";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "rate";