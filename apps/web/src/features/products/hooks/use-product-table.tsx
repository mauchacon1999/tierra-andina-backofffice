"use client";

import { PRODUCT_SORTS, type Product, type ProductSort } from "@ta/validators";
import { Pencil, Power } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type {
  DataColumn,
  DataSort,
  DataTableSorting,
  RowAction,
} from "@/components/shared/data-table/types";
import { useToggleProductActive } from "@/features/products/api/use-product-mutations";
import { ProductNameCell } from "@/features/products/components/product-name-cell";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { describeProduct } from "@/features/products/helpers/describe-product";
import type { UseProductFiltersResult } from "@/features/products/hooks/use-product-filters";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";

export type UseProductTableResult = {
  columns: DataColumn<Product>[];
  sorting: DataTableSorting;
  /** Edit and deactivate are the owner's; the manager only lists and adds products. */
  rowActions: ((product: Product) => RowAction[]) | undefined;
};

/** API sort key ("-name") ⇄ table sort ({ id: "name", desc: true }). */
function toDataSort(sort: ProductSort): DataSort {
  return sort.startsWith("-") ? { id: sort.slice(1), desc: true } : { id: sort, desc: false };
}

function toProductSort(sort: DataSort): ProductSort {
  const key = `${sort.desc ? "-" : ""}${sort.id}`;
  return PRODUCT_SORTS.find((candidate) => candidate === key) ?? "name";
}

/** Columns, server sorting (kept in the URL) and row actions of the product list. */
export function useProductTable(filters: UseProductFiltersResult): UseProductTableResult {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const labels = useUnitLabels();
  const toggle = useToggleProductActive();
  const canEdit = useRequireSession().activeMembership?.role === "owner";

  const columns = useMemo((): DataColumn<Product>[] => {
    const describe = (product: Product) => describeProduct(product, labels);
    return [
      {
        id: "name",
        header: t("list.columns.name"),
        cell: (product) => <ProductNameCell product={product} canEdit={canEdit} />,
        isPrimary: true,
        isServerSortable: true,
      },
      {
        id: "category",
        header: t("list.columns.category"),
        cell: (product) => product.categoryName,
        isServerSortable: true,
      },
      { id: "units", header: t("list.columns.units"), cell: (p) => describe(p).units },
      { id: "pack", header: t("list.columns.pack"), cell: (p) => describe(p).pack ?? tc("empty") },
      {
        id: "shrinkage",
        header: t("list.columns.shrinkage"),
        cell: (p) => describe(p).shrinkage,
        align: "end",
      },
      {
        id: "margin",
        header: t("list.columns.margin"),
        cell: (p) => describe(p).margin,
        align: "end",
      },
    ];
  }, [t, tc, labels, canEdit]);

  return {
    columns,
    sorting: {
      mode: "server",
      value: toDataSort(filters.filters.sort),
      onChange: (sort) => filters.setSort(toProductSort(sort)),
    },
    rowActions: canEdit
      ? (product) => [
          { id: "edit", label: tc("edit"), icon: Pencil, href: `/products/${product.id}` },
          {
            id: "active",
            label: product.isActive ? t("edit.deactivate") : t("edit.activate"),
            icon: Power,
            ...(product.isActive ? { tone: "danger" as const } : {}),
            onSelect: async () => {
              await toggle.run({ id: product.id, isActive: !product.isActive });
            },
          },
        ]
      : undefined,
  };
}
