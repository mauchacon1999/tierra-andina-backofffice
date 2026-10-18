CREATE TYPE "public"."payable_payment_method" AS ENUM('mobile_payment', 'bank_transfer', 'cash_bs', 'cash_usd');--> statement-breakpoint
CREATE TYPE "public"."payable_unit" AS ENUM('kg', 'unit', 'sack', 'pack');--> statement-breakpoint
CREATE TYPE "public"."purchase_trip_kind" AS ENUM('market', 'local');--> statement-breakpoint
CREATE TABLE "supplier_payment_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"supplier_id" uuid NOT NULL,
	"bank_code" text NOT NULL,
	"phone" text NOT NULL,
	"id_document" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "supplier_payment_accounts_supplier_id_bank_code_phone_key" UNIQUE("supplier_id","bank_code","phone"),
	CONSTRAINT "supplier_payment_accounts_bank_code_check" CHECK ("supplier_payment_accounts"."bank_code" ~ '^[0-9]{4}$'),
	CONSTRAINT "supplier_payment_accounts_phone_check" CHECK ("supplier_payment_accounts"."phone" ~ '^04[0-9]{9}$'),
	CONSTRAINT "supplier_payment_accounts_id_document_check" CHECK ("supplier_payment_accounts"."id_document" ~ '^[VEJGP][0-9]{5,9}$')
);
--> statement-breakpoint
CREATE TABLE "payable_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payable_id" uuid NOT NULL,
	"purchase_line_id" uuid,
	"description" text,
	"expense_category_id" uuid,
	"quantity" numeric(14, 4),
	"unit" "payable_unit",
	"unit_price" numeric(14, 4),
	"subtotal" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "payable_lines_purchase_line_id_key" UNIQUE("purchase_line_id"),
	CONSTRAINT "payable_lines_item_check" CHECK (("payable_lines"."purchase_line_id" IS NOT NULL AND "payable_lines"."description" IS NULL
          AND "payable_lines"."expense_category_id" IS NULL AND "payable_lines"."quantity" IS NULL AND "payable_lines"."unit" IS NULL
          AND "payable_lines"."unit_price" IS NULL)
        OR ("payable_lines"."purchase_line_id" IS NULL AND "payable_lines"."description" IS NOT NULL
          AND length(trim("payable_lines"."description")) > 0 AND "payable_lines"."expense_category_id" IS NOT NULL
          AND "payable_lines"."quantity" IS NOT NULL AND "payable_lines"."unit" IS NOT NULL AND "payable_lines"."unit_price" IS NOT NULL)),
	CONSTRAINT "payable_lines_amounts_check" CHECK ("payable_lines"."subtotal" >= 0 AND ("payable_lines"."quantity" IS NULL OR "payable_lines"."quantity" > 0)
        AND ("payable_lines"."unit_price" IS NULL OR "payable_lines"."unit_price" >= 0))
);
--> statement-breakpoint
ALTER TABLE "payables" DROP CONSTRAINT "payables_purchase_line_id_key";--> statement-breakpoint
ALTER TABLE "payables" DROP CONSTRAINT "payables_amount_check";--> statement-breakpoint
DROP INDEX "payable_payments_payment_method_id_idx";--> statement-breakpoint
DROP INDEX "purchase_trips_one_open_idx";--> statement-breakpoint
ALTER TABLE "payable_payments" ALTER COLUMN "payment_method_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payables" ALTER COLUMN "supplier_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payables" ALTER COLUMN "concept" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payables" ALTER COLUMN "amount_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payables" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD COLUMN "kind" "purchase_trip_kind" DEFAULT 'market' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD COLUMN "method" "payable_payment_method" NOT NULL;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD COLUMN "currency" "currency" NOT NULL;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD COLUMN "applied" numeric(14, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "payables" ADD COLUMN "number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "payables" ADD COLUMN "currency" "currency" DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "payables" ADD COLUMN "total" numeric(14, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "payables" ADD COLUMN "trip_id" uuid;--> statement-breakpoint
ALTER TABLE "payables" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "payables" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payables" ADD COLUMN "voided_by" uuid;--> statement-breakpoint
ALTER TABLE "supplier_payment_accounts" ADD CONSTRAINT "supplier_payment_accounts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_accounts" ADD CONSTRAINT "supplier_payment_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_accounts" ADD CONSTRAINT "supplier_payment_accounts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_lines" ADD CONSTRAINT "payable_lines_payable_id_payables_id_fk" FOREIGN KEY ("payable_id") REFERENCES "public"."payables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_lines" ADD CONSTRAINT "payable_lines_purchase_line_id_purchase_lines_id_fk" FOREIGN KEY ("purchase_line_id") REFERENCES "public"."purchase_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_lines" ADD CONSTRAINT "payable_lines_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_lines" ADD CONSTRAINT "payable_lines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_lines" ADD CONSTRAINT "payable_lines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supplier_payment_accounts_supplier_id_idx" ON "supplier_payment_accounts" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "payable_lines_payable_id_idx" ON "payable_lines" USING btree ("payable_id");--> statement-breakpoint
CREATE INDEX "payable_lines_expense_category_id_idx" ON "payable_lines" USING btree ("expense_category_id");--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD CONSTRAINT "purchase_trips_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_account_id_supplier_payment_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."supplier_payment_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_trip_id_purchase_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."purchase_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_trips_supplier_id_idx" ON "purchase_trips" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "payable_payments_account_id_idx" ON "payable_payments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "payables_trip_id_idx" ON "payables" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "payables_voided_by_idx" ON "payables" USING btree ("voided_by");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_trips_one_open_idx" ON "purchase_trips" USING btree ("store_id") WHERE "purchase_trips"."status" = 'open' AND "purchase_trips"."kind" = 'market';--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_store_id_number_key" UNIQUE("store_id","number");--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_trip_id_supplier_id_key" UNIQUE("trip_id","supplier_id");--> statement-breakpoint
ALTER TABLE "purchase_trips" ADD CONSTRAINT "purchase_trips_local_supplier_check" CHECK ("purchase_trips"."kind" = 'market' OR "purchase_trips"."supplier_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_applied_check" CHECK ("payable_payments"."applied" > 0);--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_number_check" CHECK ("payables"."number" > 0);--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_voided_check" CHECK ("payables"."voided_by" IS NULL OR "payables"."voided_at" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_amount_check" CHECK ("payables"."total" >= 0);