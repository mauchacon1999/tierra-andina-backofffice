ALTER TABLE "price_list_lines" ALTER COLUMN "unit_cost_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "price_list_lines" ALTER COLUMN "margin" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "share_on_whatsapp" boolean DEFAULT false NOT NULL;