"use client";

import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useProductCategories } from "@/features/products/api/use-product-categories";
import type { UseProductFiltersResult } from "@/features/products/hooks/use-product-filters";

export type ProductFiltersProps = {
  filters: UseProductFiltersResult;
};

/** Search first (big, at the top), then category and the "Inactivos" switch. */
export function ProductFilters({ filters }: ProductFiltersProps): React.JSX.Element {
  const { categories } = useProductCategories();
  const t = useTranslations("products.filters");

  return (
    <div className="space-y-3">
      <TextField
        label={t("search")}
        type="search"
        autoComplete="off"
        placeholder={t("searchPlaceholder")}
        value={filters.searchText}
        onChange={(event) => filters.setSearchText(event.target.value)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-64">
          <SelectField
            label={t("category")}
            placeholder={t("allCategories")}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={filters.filters.categoryId}
            onChange={(event) => filters.setCategoryId(event.target.value)}
          />
        </div>
        <Checkbox
          label={t("showInactive")}
          checked={filters.filters.showInactive}
          onChange={(event) => filters.setShowInactive(event.target.checked)}
        />
      </div>
    </div>
  );
}
