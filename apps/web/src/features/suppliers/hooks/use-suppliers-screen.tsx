"use client";

import type { Supplier } from "@ta/validators";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useSuppliers } from "@/features/purchases/api/use-trips";

export type UseSuppliersScreenResult = {
  suppliers: Supplier[];
  isLoading: boolean;
  columns: DataColumn<Supplier>[];
  /** Only the owner opens a supplier (data and pago móvil accounts). */
  rowActions: ((supplier: Supplier) => RowAction[]) | undefined;
  canOpen: boolean;
  isCreating: boolean;
  openCreate: () => void;
  closeCreate: () => void;
};

/**
 * The suppliers list: columns, the "Ver" action and the "Nuevo proveedor" dialog. The manager
 * lists and adds suppliers; opening one is the owner's.
 */
export function useSuppliersScreen(): UseSuppliersScreenResult {
  const t = useTranslations("suppliers");
  const { suppliers, isLoading } = useSuppliers();
  const canOpen = useRequireSession().activeMembership?.role === "owner";
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
    rowActions: canOpen
      ? (supplier) => [
          { id: "open", label: t("open"), icon: Eye, href: `/suppliers/${supplier.id}` },
        ]
      : undefined,
    canOpen,
    isCreating,
    openCreate: () => setCreating(true),
    closeCreate: () => setCreating(false),
  };
}
