"use client";

import type { ManualPriceRow } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import type { DataColumn } from "@/components/shared/data-table/types";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import {
  useManualPrices,
  useShareOnWhatsapp,
  type UseManualPricesResult,
} from "@/features/price-lists/api/use-manual-prices";
import { buildWhatsappText, whatsappRows } from "@/features/price-lists/helpers/whatsapp-text";
import { useManualPriceTable } from "@/features/price-lists/hooks/use-manual-price-table";
import { useCopy, type CopyState } from "@/hooks/use-copy";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDate, todayBusinessDate } from "@/utils/format-date";
import { formatBs } from "@/utils/format-number";

export type UseManualPricesScreenResult = UseManualPricesResult & {
  columns: DataColumn<ManualPriceRow>[];
  search: string;
  setSearch: (text: string) => void;
  /** Rows whose name contains the search (accents and case ignored). */
  visibleRows: ManualPriceRow[];
  /** Products that the WhatsApp copy will carry (on, with a price). */
  whatsappCount: number;
  copyForWhatsapp: () => Promise<void>;
  copied: CopyState;
  /** A failed WhatsApp switch, shown above the table. */
  actionError: string | null;
};

const COPY_KEY = "whatsapp";

/** Accents and case do not matter in the search ("name" finds "Ñame" too). */
function searchable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** "Precio manual": search, the table, the WhatsApp switches and the copy for the group. */
export function useManualPricesScreen(): UseManualPricesScreenResult {
  const prices = useManualPrices();
  const t = useTranslations("manualPrices");
  const units = useUnitLabels();
  const errorMessage = useErrorMessage();
  const { activeMembership } = useRequireSession();
  const share = useShareOnWhatsapp();
  const copier = useCopy();
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const onToggleWhatsapp = useCallback(
    (row: ManualPriceRow, value: boolean) => {
      setActionError(null);
      share(row, value).catch((error: unknown) =>
        setActionError(errorMessage(error, t("whatsappFailed", { product: row.productName }))),
      );
    },
    [share, errorMessage, t],
  );
  const columns = useManualPriceTable({ saleRate: prices.saleRate, onToggleWhatsapp });

  const visibleRows = useMemo(() => {
    const wanted = searchable(search);
    if (wanted === "") return prices.rows;
    return prices.rows.filter((row) => searchable(row.productName).includes(wanted));
  }, [prices.rows, search]);

  const toCopy = whatsappRows(prices.rows);

  return {
    ...prices,
    columns,
    search,
    setSearch,
    visibleRows,
    whatsappCount: toCopy.length,
    copyForWhatsapp: () =>
      copier.copy(
        COPY_KEY,
        buildWhatsappText(toCopy, {
          title: t("whatsappTitle", {
            store: activeMembership?.storeName ?? "",
            date: formatBusinessDate(todayBusinessDate()),
          }),
          line: (row) =>
            t("whatsappLine", {
              product: row.productName,
              price: formatBs(row.priceBs),
              unit: units.suffix(row.saleUnit),
            }),
        }),
      ),
    copied: copier.last?.key === COPY_KEY ? copier.last : null,
    actionError,
  };
}
