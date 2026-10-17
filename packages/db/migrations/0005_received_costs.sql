ALTER TABLE "purchase_lines" ADD COLUMN "received_usable_quantity" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "received_unit_cost_usd" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "received_sale_price_usd" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_received_costs_check" CHECK (("purchase_lines"."receipt_status" = 'partial'
          AND "purchase_lines"."received_usable_quantity" IS NOT NULL AND "purchase_lines"."received_usable_quantity" > 0
          AND "purchase_lines"."received_unit_cost_usd" IS NOT NULL AND "purchase_lines"."received_unit_cost_usd" >= 0
          AND "purchase_lines"."received_sale_price_usd" IS NOT NULL AND "purchase_lines"."received_sale_price_usd" >= 0)
        OR ("purchase_lines"."receipt_status" <> 'partial' AND "purchase_lines"."received_usable_quantity" IS NULL
          AND "purchase_lines"."received_unit_cost_usd" IS NULL AND "purchase_lines"."received_sale_price_usd" IS NULL));