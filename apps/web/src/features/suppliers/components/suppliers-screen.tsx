"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CreateSupplierForm } from "@/features/suppliers/components/supplier-forms";
import { useSuppliersScreen } from "@/features/suppliers/hooks/use-suppliers-screen";

/** Stalls and local suppliers; each one opens its data and pago móvil accounts. */
export function SuppliersScreen(): React.JSX.Element {
  const s = useSuppliersScreen();
  const router = useRouter();
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={s.openCreate}>{t("new")}</Button>
      </div>
      <DataTable
        label={t("label")}
        data={s.isLoading ? undefined : s.suppliers}
        columns={s.columns}
        getRowId={(supplier) => supplier.id}
        rowName={(supplier) => supplier.name}
        rowActions={s.rowActions}
        sorting={{ mode: "client", initial: { id: "name", desc: false } }}
        isLoading={s.isLoading}
        empty={<p className="text-muted">{t("empty")}</p>}
      />
      <Dialog
        isOpen={s.isCreating}
        onClose={s.closeCreate}
        title={t("new")}
        closeLabel={tc("close")}
      >
        {s.isCreating && (
          <CreateSupplierForm
            onDone={(supplier) => {
              s.closeCreate();
              router.push(`/suppliers/${supplier.id}`);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
