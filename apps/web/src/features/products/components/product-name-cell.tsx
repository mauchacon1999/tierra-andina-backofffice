"use client";

import type { Product } from "@ta/validators";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export type ProductNameCellProps = {
  product: Product;
  /** Links to the edit screen (owner); the manager sees the name only. */
  canEdit: boolean;
};

/** Product name linking to its edit screen, with "Inactivo" when it is deactivated. */
export function ProductNameCell({ product, canEdit }: ProductNameCellProps): React.JSX.Element {
  const t = useTranslations("products.list");

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {!canEdit && <span className="font-medium">{product.name}</span>}
      {canEdit && (
        <Link
          href={`/products/${product.id}`}
          className="font-medium text-primary-text hover:underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        >
          {product.name}
        </Link>
      )}
      {!product.isActive && <Badge>{t("inactive")}</Badge>}
    </span>
  );
}
