CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "product_categories_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"purchase_unit" "purchase_unit" NOT NULL,
	"sale_unit" "sale_unit" NOT NULL,
	"default_pack_quantity" numeric(14, 4),
	"last_shrinkage" numeric(14, 4) DEFAULT '0' NOT NULL,
	"last_margin" numeric(14, 4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "products_normalized_name_key" UNIQUE("normalized_name"),
	CONSTRAINT "products_unit_combination_check" CHECK (NOT ("products"."purchase_unit" = 'kg' AND "products"."sale_unit" = 'unit')),
	CONSTRAINT "products_default_pack_quantity_check" CHECK (("products"."purchase_unit" = 'kg' AND "products"."default_pack_quantity" IS NULL)
        OR ("products"."purchase_unit" <> 'kg' AND "products"."default_pack_quantity" > 0)),
	CONSTRAINT "products_last_shrinkage_check" CHECK ("products"."last_shrinkage" >= 0
        AND ("products"."default_pack_quantity" IS NULL OR "products"."last_shrinkage" < "products"."default_pack_quantity")),
	CONSTRAINT "products_last_margin_check" CHECK ("products"."last_margin" >= 0 AND "products"."last_margin" <= 5)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "supplier_kind" NOT NULL,
	"phone" text,
	"stall_reference" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid,
	"business_date" date NOT NULL,
	"kind" "exchange_rate_kind" NOT NULL,
	"value" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "exchange_rates_store_id_business_date_kind_key" UNIQUE NULLS NOT DISTINCT("store_id","business_date","kind"),
	CONSTRAINT "exchange_rates_value_check" CHECK ("exchange_rates"."value" > 0),
	CONSTRAINT "exchange_rates_store_scope_check" CHECK (("exchange_rates"."kind" = 'bcv') = ("exchange_rates"."store_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "purchase_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"supplier_id" uuid,
	"stall_reference" text,
	"product_id" uuid NOT NULL,
	"purchase_unit" "purchase_unit" NOT NULL,
	"packs" numeric(14, 4) NOT NULL,
	"gross_quantity" numeric(14, 4) NOT NULL,
	"shrinkage" numeric(14, 4) DEFAULT '0' NOT NULL,
	"usable_quantity" numeric(14, 4) NOT NULL,
	"quoted_price_usd" numeric(14, 4) NOT NULL,
	"amount_bs" numeric(14, 4) NOT NULL,
	"supplier_rate" numeric(14, 4) NOT NULL,
	"real_cost_usd" numeric(14, 4) NOT NULL,
	"unit_cost_usd" numeric(14, 4) NOT NULL,
	"margin" numeric(14, 4) NOT NULL,
	"sale_price_usd" numeric(14, 4) NOT NULL,
	"payment_status" "payment_status" NOT NULL,
	"receipt_status" "receipt_status" DEFAULT 'pending' NOT NULL,
	"received_packs" numeric(14, 4),
	"received_quantity" numeric(14, 4),
	"received_by" uuid,
	"received_at" timestamp with time zone,
	"receipt_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchase_lines_packs_check" CHECK ("purchase_lines"."packs" > 0),
	CONSTRAINT "purchase_lines_gross_quantity_check" CHECK ("purchase_lines"."gross_quantity" > 0),
	CONSTRAINT "purchase_lines_shrinkage_check" CHECK ("purchase_lines"."shrinkage" >= 0 AND "purchase_lines"."shrinkage" < "purchase_lines"."gross_quantity"),
	CONSTRAINT "purchase_lines_usable_quantity_check" CHECK ("purchase_lines"."usable_quantity" = "purchase_lines"."gross_quantity" - "purchase_lines"."shrinkage"),
	CONSTRAINT "purchase_lines_amounts_check" CHECK ("purchase_lines"."quoted_price_usd" >= 0 AND "purchase_lines"."amount_bs" >= 0 AND "purchase_lines"."real_cost_usd" >= 0
        AND "purchase_lines"."unit_cost_usd" >= 0 AND "purchase_lines"."sale_price_usd" >= 0),
	CONSTRAINT "purchase_lines_supplier_rate_check" CHECK ("purchase_lines"."supplier_rate" > 0),
	CONSTRAINT "purchase_lines_margin_check" CHECK ("purchase_lines"."margin" >= 0 AND "purchase_lines"."margin" <= 5),
	CONSTRAINT "purchase_lines_received_packs_check" CHECK ("purchase_lines"."received_packs" IS NULL OR ("purchase_lines"."received_packs" >= 0 AND "purchase_lines"."received_packs" <= "purchase_lines"."packs")),
	CONSTRAINT "purchase_lines_received_quantity_check" CHECK ("purchase_lines"."received_quantity" IS NULL
        OR ("purchase_lines"."received_quantity" >= 0 AND "purchase_lines"."received_quantity" <= "purchase_lines"."gross_quantity"))
);
--> statement-breakpoint
CREATE TABLE "purchase_trips" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"bcv_rate" numeric(14, 4) NOT NULL,
	"status" "purchase_trip_status" DEFAULT 'open' NOT NULL,
	"total_usd" numeric(14, 4) DEFAULT '0' NOT NULL,
	"total_bs" numeric(14, 4) DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchase_trips_bcv_rate_check" CHECK ("purchase_trips"."bcv_rate" > 0),
	CONSTRAINT "purchase_trips_amounts_check" CHECK ("purchase_trips"."total_usd" >= 0 AND "purchase_trips"."total_bs" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shopping_list_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"note" text,
	"status" "shopping_list_item_status" DEFAULT 'open' NOT NULL,
	"purchase_line_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "supplier_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"purchase_line_id" uuid NOT NULL,
	"supplier_id" uuid,
	"missing_packs" numeric(14, 4) NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"status" "supplier_claim_status" DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "supplier_claims_purchase_line_id_key" UNIQUE("purchase_line_id"),
	CONSTRAINT "supplier_claims_amounts_check" CHECK ("supplier_claims"."missing_packs" >= 0 AND "supplier_claims"."amount_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "price_list_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"price_list_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"unit_cost_usd" numeric(14, 4) NOT NULL,
	"margin" numeric(14, 4) NOT NULL,
	"price_usd" numeric(14, 4) NOT NULL,
	"price_bs" numeric(14, 4) NOT NULL,
	"source_purchase_line_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "price_list_lines_price_list_id_product_id_key" UNIQUE("price_list_id","product_id"),
	CONSTRAINT "price_list_lines_amounts_check" CHECK ("price_list_lines"."unit_cost_usd" >= 0 AND "price_list_lines"."price_usd" >= 0 AND "price_list_lines"."price_bs" >= 0),
	CONSTRAINT "price_list_lines_margin_check" CHECK ("price_list_lines"."margin" >= 0 AND "price_list_lines"."margin" <= 5)
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"trip_id" uuid,
	"sale_rate" numeric(14, 4) NOT NULL,
	"status" "price_list_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "price_lists_sale_rate_check" CHECK ("price_lists"."sale_rate" > 0),
	CONSTRAINT "price_lists_published_check" CHECK ("price_lists"."status" <> 'published' OR "price_lists"."published_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_trip_id_purchase_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."purchase_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD CONSTRAINT "purchase_trips_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD CONSTRAINT "purchase_trips_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD CONSTRAINT "purchase_trips_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_purchase_line_id_purchase_lines_id_fk" FOREIGN KEY ("purchase_line_id") REFERENCES "public"."purchase_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_claims" ADD CONSTRAINT "supplier_claims_purchase_line_id_purchase_lines_id_fk" FOREIGN KEY ("purchase_line_id") REFERENCES "public"."purchase_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_claims" ADD CONSTRAINT "supplier_claims_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_claims" ADD CONSTRAINT "supplier_claims_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_claims" ADD CONSTRAINT "supplier_claims_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_source_purchase_line_id_purchase_lines_id_fk" FOREIGN KEY ("source_purchase_line_id") REFERENCES "public"."purchase_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_trip_id_purchase_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."purchase_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "exchange_rates_business_date_idx" ON "exchange_rates" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "purchase_lines_trip_id_idx" ON "purchase_lines" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "purchase_lines_supplier_id_idx" ON "purchase_lines" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_lines_product_id_idx" ON "purchase_lines" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "purchase_lines_received_by_idx" ON "purchase_lines" USING btree ("received_by");--> statement-breakpoint
CREATE INDEX "purchase_trips_store_id_idx" ON "purchase_trips" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "purchase_trips_business_date_idx" ON "purchase_trips" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "shopping_list_items_store_id_idx" ON "shopping_list_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "shopping_list_items_product_id_idx" ON "shopping_list_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "shopping_list_items_requested_by_idx" ON "shopping_list_items" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "shopping_list_items_purchase_line_id_idx" ON "shopping_list_items" USING btree ("purchase_line_id");--> statement-breakpoint
CREATE INDEX "supplier_claims_supplier_id_idx" ON "supplier_claims" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "price_list_lines_product_id_idx" ON "price_list_lines" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_list_lines_source_purchase_line_id_idx" ON "price_list_lines" USING btree ("source_purchase_line_id");--> statement-breakpoint
CREATE INDEX "price_lists_store_id_idx" ON "price_lists" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "price_lists_trip_id_idx" ON "price_lists" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "price_lists_published_by_idx" ON "price_lists" USING btree ("published_by");