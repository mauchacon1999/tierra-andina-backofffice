CREATE TABLE "daily_close_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"daily_close_id" uuid NOT NULL,
	"payment_method_id" uuid NOT NULL,
	"amount" numeric(14, 4) NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "daily_close_payments_daily_close_id_payment_method_id_key" UNIQUE("daily_close_id","payment_method_id"),
	CONSTRAINT "daily_close_payments_amounts_check" CHECK ("daily_close_payments"."amount" >= 0 AND "daily_close_payments"."amount_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "daily_closes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"submitted_by" uuid NOT NULL,
	"rate" numeric(14, 4) NOT NULL,
	"total_usd" numeric(14, 4) NOT NULL,
	"credit_sold_bs" numeric(14, 4) DEFAULT '0' NOT NULL,
	"cash_destination" "cash_destination" NOT NULL,
	"status" "daily_close_status" DEFAULT 'submitted' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "daily_closes_store_id_business_date_key" UNIQUE("store_id","business_date"),
	CONSTRAINT "daily_closes_rate_check" CHECK ("daily_closes"."rate" > 0),
	CONSTRAINT "daily_closes_amounts_check" CHECK ("daily_closes"."total_usd" >= 0 AND "daily_closes"."credit_sold_bs" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"currency" "currency" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "payment_methods_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "customer_credit_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"kind" "credit_entry_kind" NOT NULL,
	"business_date" date NOT NULL,
	"amount_bs" numeric(14, 4) NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"rate" numeric(14, 4) NOT NULL,
	"daily_close_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "customer_credit_entries_amounts_check" CHECK ("customer_credit_entries"."amount_bs" >= 0 AND "customer_credit_entries"."amount_usd" >= 0),
	CONSTRAINT "customer_credit_entries_rate_check" CHECK ("customer_credit_entries"."rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" "expense_kind" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "expense_categories_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"amount_bs" numeric(14, 4) NOT NULL,
	"rate" numeric(14, 4) NOT NULL,
	"recurring_expense_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "expenses_amounts_check" CHECK ("expenses"."amount_usd" >= 0 AND "expenses"."amount_bs" >= 0),
	CONSTRAINT "expenses_rate_check" CHECK ("expenses"."rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "payable_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payable_id" uuid NOT NULL,
	"paid_on" date NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"amount_bs" numeric(14, 4) NOT NULL,
	"rate" numeric(14, 4) NOT NULL,
	"payment_method_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "payable_payments_amounts_check" CHECK ("payable_payments"."amount_usd" >= 0 AND "payable_payments"."amount_bs" >= 0),
	CONSTRAINT "payable_payments_rate_check" CHECK ("payable_payments"."rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "payables" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"supplier_id" uuid,
	"concept" text NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"issued_on" date NOT NULL,
	"due_on" date,
	"purchase_line_id" uuid,
	"status" "payable_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "payables_purchase_line_id_key" UNIQUE("purchase_line_id"),
	CONSTRAINT "payables_amount_check" CHECK ("payables"."amount_usd" >= 0),
	CONSTRAINT "payables_due_on_check" CHECK ("payables"."due_on" IS NULL OR "payables"."due_on" >= "payables"."issued_on")
);
--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"frequency" "recurrence_frequency" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "recurring_expenses_amount_check" CHECK ("recurring_expenses"."amount_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"job_title" text,
	"weekly_salary_usd" numeric(14, 4) NOT NULL,
	"user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "employees_weekly_salary_check" CHECK ("employees"."weekly_salary_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payroll_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"salary_usd" numeric(14, 4) NOT NULL,
	"advances_usd" numeric(14, 4) DEFAULT '0' NOT NULL,
	"paid_usd" numeric(14, 4) NOT NULL,
	"paid_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "payroll_payments_employee_id_week_start_key" UNIQUE("employee_id","week_start"),
	CONSTRAINT "payroll_payments_amounts_check" CHECK ("payroll_payments"."salary_usd" >= 0 AND "payroll_payments"."advances_usd" >= 0 AND "payroll_payments"."paid_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "salary_advances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_id" uuid NOT NULL,
	"paid_on" date NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"amount_bs" numeric(14, 4) NOT NULL,
	"rate" numeric(14, 4) NOT NULL,
	"payroll_payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "salary_advances_amounts_check" CHECK ("salary_advances"."amount_usd" >= 0 AND "salary_advances"."amount_bs" >= 0),
	CONSTRAINT "salary_advances_rate_check" CHECK ("salary_advances"."rate" > 0)
);
--> statement-breakpoint
ALTER TABLE "daily_close_payments" ADD CONSTRAINT "daily_close_payments_daily_close_id_daily_closes_id_fk" FOREIGN KEY ("daily_close_id") REFERENCES "public"."daily_closes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_close_payments" ADD CONSTRAINT "daily_close_payments_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_close_payments" ADD CONSTRAINT "daily_close_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_close_payments" ADD CONSTRAINT "daily_close_payments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ADD CONSTRAINT "customer_credit_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ADD CONSTRAINT "customer_credit_entries_daily_close_id_daily_closes_id_fk" FOREIGN KEY ("daily_close_id") REFERENCES "public"."daily_closes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ADD CONSTRAINT "customer_credit_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_entries" ADD CONSTRAINT "customer_credit_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurring_expense_id_recurring_expenses_id_fk" FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_payable_id_payables_id_fk" FOREIGN KEY ("payable_id") REFERENCES "public"."payables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_purchase_line_id_purchase_lines_id_fk" FOREIGN KEY ("purchase_line_id") REFERENCES "public"."purchase_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_payroll_payment_id_payroll_payments_id_fk" FOREIGN KEY ("payroll_payment_id") REFERENCES "public"."payroll_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_close_payments_payment_method_id_idx" ON "daily_close_payments" USING btree ("payment_method_id");--> statement-breakpoint
CREATE INDEX "daily_closes_business_date_idx" ON "daily_closes" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "daily_closes_submitted_by_idx" ON "daily_closes" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "customer_credit_entries_customer_id_idx" ON "customer_credit_entries" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_credit_entries_business_date_idx" ON "customer_credit_entries" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "customer_credit_entries_daily_close_id_idx" ON "customer_credit_entries" USING btree ("daily_close_id");--> statement-breakpoint
CREATE INDEX "customers_store_id_idx" ON "customers" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "expenses_store_id_idx" ON "expenses" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "expenses_category_id_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "expenses_business_date_idx" ON "expenses" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "expenses_recurring_expense_id_idx" ON "expenses" USING btree ("recurring_expense_id");--> statement-breakpoint
CREATE INDEX "payable_payments_payable_id_idx" ON "payable_payments" USING btree ("payable_id");--> statement-breakpoint
CREATE INDEX "payable_payments_payment_method_id_idx" ON "payable_payments" USING btree ("payment_method_id");--> statement-breakpoint
CREATE INDEX "payables_store_id_idx" ON "payables" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "payables_supplier_id_idx" ON "payables" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "recurring_expenses_store_id_idx" ON "recurring_expenses" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "recurring_expenses_category_id_idx" ON "recurring_expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "employees_store_id_idx" ON "employees" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "salary_advances_employee_id_idx" ON "salary_advances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "salary_advances_payroll_payment_id_idx" ON "salary_advances" USING btree ("payroll_payment_id");