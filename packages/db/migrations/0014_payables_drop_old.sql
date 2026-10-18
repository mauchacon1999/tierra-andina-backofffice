ALTER TABLE "payable_payments" DROP CONSTRAINT "payable_payments_payment_method_id_payment_methods_id_fk";
--> statement-breakpoint
ALTER TABLE "payables" DROP CONSTRAINT "payables_purchase_line_id_purchase_lines_id_fk";
--> statement-breakpoint
ALTER TABLE "payable_payments" DROP COLUMN "payment_method_id";--> statement-breakpoint
ALTER TABLE "payables" DROP COLUMN "concept";--> statement-breakpoint
ALTER TABLE "payables" DROP COLUMN "amount_usd";--> statement-breakpoint
ALTER TABLE "payables" DROP COLUMN "purchase_line_id";--> statement-breakpoint
ALTER TABLE "payables" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."payable_status";