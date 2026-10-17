import type { Product } from "@ta/validators";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { describeProduct } from "@/features/products/helpers/describe-product";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { cn } from "@/utils/cn";

export type ProductCardProps = {
  product: Product;
};

/** One product in the mobile list; the whole card opens the edit screen. */
export function ProductCard({ product }: ProductCardProps): React.JSX.Element {
  const t = useTranslations("products.list");
  const d = describeProduct(product, useUnitLabels());

  return (
    <Link
      href={`/products/${product.id}`}
      className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
    >
      <Card className={cn("space-y-1", !product.isActive && "opacity-60")}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{product.name}</p>
          {!product.isActive && <Badge>{t("inactive")}</Badge>}
        </div>
        <p className="text-sm text-muted">
          {t("cardCategory", { category: product.categoryName, units: d.units })}
        </p>
        <p className="text-sm text-muted">
          {d.pack
            ? t("cardDetailsWithPack", { pack: d.pack, shrinkage: d.shrinkage, margin: d.margin })
            : t("cardDetails", { shrinkage: d.shrinkage, margin: d.margin })}
        </p>
      </Card>
    </Link>
  );
}
