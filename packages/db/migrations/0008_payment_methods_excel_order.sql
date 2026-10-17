-- The daily close shows the payment methods in the order of the shop's Excel close
-- (Punto de venta, Efectivo, Dólares, Pago móvil). The seed never updates existing rows.
UPDATE "payment_methods" SET "sort_order" = 1 WHERE "code" = 'card_terminal';--> statement-breakpoint
UPDATE "payment_methods" SET "sort_order" = 2 WHERE "code" = 'cash_bs';--> statement-breakpoint
UPDATE "payment_methods" SET "sort_order" = 3 WHERE "code" = 'cash_usd';--> statement-breakpoint
UPDATE "payment_methods" SET "sort_order" = 4 WHERE "code" = 'mobile_payment';
