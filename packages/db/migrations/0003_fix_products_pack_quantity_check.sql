ALTER TABLE "products" DROP CONSTRAINT "products_default_pack_quantity_check";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_default_pack_quantity_check" CHECK (("products"."purchase_unit" = 'kg' AND "products"."default_pack_quantity" IS NULL)
        OR ("products"."purchase_unit" <> 'kg' AND "products"."default_pack_quantity" IS NOT NULL
          AND "products"."default_pack_quantity" > 0));