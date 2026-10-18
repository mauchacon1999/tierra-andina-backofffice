"use client";

import type { Supplier } from "@ta/validators";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { useSuppliers } from "@/features/purchases/api/use-trips";

export type UseSuppliersScreenResult = {
  suppliers: Supplier[];
  isLoading: boolean;
  columns: DataColumn<Supplier>[];
  rowActions: (supplier: Supplier) => RowAction[];
  isCreating: boolean;
  openCreate: () => void;
  closeCreate: () => void;
};

/** The suppliers list: columns, the "Ver" action and the "Nuevo proveedor" dialog. */
export function useSuppliersScreen(): UseSuppliersScreenResult {
  const t = useTranslations("suppliers");
  const { suppliers, isLoading } = useSuppliers();
  const [isCreating, setCreating] = useState(false);

  const columns = useMemo(
    (): DataColumn<Supplier>[] => [
      {
        id: "name",
        header: t("columns.name"),
        cell: (supplier) => <span className="font-medium">{supplier.name}</span>,
        sortValue: (supplier) => supplier.name,
        isPrimary: true,
      },
      {
        id: "kind",
        header: t("columns.kind"),
        cell: (supplier) => t(`kinds.${supplier.kind}`),
        sortValue: (supplier) => supplier.kind,
      },
      {
        id: "phone",
        header: t("columns.phone"),
        cell: (supplier) => supplier.phone ?? "—",
      },
    ],
    [t],
  );

  return {
    suppliers,
    isLoading,
    columns,
    rowActions: (supplier) => [
      { id: "open", label: t("open"), icon: Eye, href: `/suppliers/${supplier.id}` },
    ],
    isCreating,
    openCreate: () => setCreating(true),
    closeCreate: () => setCreating(false),
  };
}
