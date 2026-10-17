"use client";

import type { TripDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Dialog } from "@/components/ui/dialog";
import { PurchaseLineForm } from "@/features/purchases/components/purchase-line-form";
import { useLineTable } from "@/features/purchases/hooks/use-line-table";
import type { UseTripScreenResult } from "@/features/purchases/hooks/use-trip-screen";

export type TripLinesProps = {
  trip: TripDetail;
  screen: UseTripScreenResult;
};

/** The trip's purchases (sortable table / cards) with edit in a dialog and delete on confirm. */
export function TripLines({ trip, screen }: TripLinesProps): React.JSX.Element {
  const t = useTranslations("purchases.trip");
  const tc = useTranslations("common");
  const table = useLineTable({
    canEdit: screen.isOpen,
    onEdit: screen.editLine,
    onDelete: (line) => screen.deleteLine(line.id),
  });
  const editing = screen.editingLine;

  return (
    <section className="space-y-3" aria-label={t("linesLabel")}>
      <h2 className="font-semibold">{t("lines", { count: trip.lines.length })}</h2>
      <DataTable
        label={t("linesLabel")}
        data={trip.lines}
        columns={table.columns}
        getRowId={(line) => line.id}
        rowName={(line) => line.productName}
        {...(table.rowActions ? { rowActions: table.rowActions } : {})}
        sorting={{ mode: "client" }}
        empty={<p className="text-sm text-muted">{t("noLines")}</p>}
      />
      <Dialog
        isOpen={editing !== null}
        onClose={screen.stopEditing}
        title={editing ? t("editLine", { product: editing.productName }) : t("editTitle")}
        closeLabel={tc("close")}
      >
        {editing && (
          <PurchaseLineForm
            trip={trip}
            line={editing}
            onDone={screen.stopEditing}
            onCancel={screen.stopEditing}
          />
        )}
      </Dialog>
    </section>
  );
}
