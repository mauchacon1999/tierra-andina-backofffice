"use client";

import {
  openTripSchema,
  type OpenTrip,
  type OpenTripInput,
  type Supplier,
  type Trip,
  type TripList,
} from "@ta/validators";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { useDailyRates } from "@/features/exchange-rates/api/use-daily-rates";
import { useOpenTrip } from "@/features/purchases/api/use-trip-mutations";
import { useSuppliers, useTrips } from "@/features/purchases/api/use-trips";
import { useFormError } from "@/hooks/use-form-error";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatUsd } from "@/utils/format-number";

const PAGE_SIZE = 20;

export type UseOpenLocalPurchaseResult = {
  form: UseFormReturn<OpenTripInput, unknown, OpenTrip>;
  suppliers: Supplier[];
  /** The chosen day has no BCV rate (the purchase is costed with it). */
  isBcvMissing: boolean;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

/** "Nueva compra local": who brings the goods and the day; then the purchase's screen. */
export function useOpenLocalPurchase(today: string): UseOpenLocalPurchaseResult {
  const t = useTranslations("localPurchases.open");
  const router = useRouter();
  const { suppliers } = useSuppliers();
  const open = useOpenTrip();
  const form = useForm<OpenTripInput, unknown, OpenTrip>({
    resolver: useZodResolver(openTripSchema),
    defaultValues: { kind: "local", businessDate: today, supplierId: "", note: "" },
  });
  const businessDate = useWatch({ control: form.control, name: "businessDate" });
  const { rates } = useDailyRates(businessDate);
  const showError = useFormError(form, t("failed"));
  const onSubmit = form.handleSubmit(async (input) => {
    try {
      const trip = await open.run(input);
      router.push(`/purchases/${trip.id}`);
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    suppliers,
    isBcvMissing: rates !== undefined && rates.bcv === null,
    onSubmit: () => onSubmit(),
    isSubmitting: open.isRunning,
    formError: form.formState.errors.root?.message,
  };
}

export type UseLocalPurchasesResult = {
  inProgress: Trip[];
  saved: TripList | undefined;
  isLoading: boolean;
  columns: DataColumn<Trip>[];
  rowActions: (trip: Trip) => RowAction[];
  setPage: (page: number) => void;
};

const NO_TRIPS: Trip[] = [];

/** Local purchases in progress (several may be open) and the saved ones, newest first. */
export function useLocalPurchases(): UseLocalPurchasesResult {
  const t = useTranslations("localPurchases");
  const [page, setPage] = useState(1);
  const open = useTrips({ kind: "local", status: "open", page: 1, pageSize: 50 });
  const saved = useTrips({ kind: "local", status: "closed", page, pageSize: PAGE_SIZE });

  const columns = useMemo(
    (): DataColumn<Trip>[] => [
      {
        id: "date",
        header: t("columns.date"),
        cell: (trip) => (
          <span className="capitalize">{formatBusinessDateLong(trip.businessDate)}</span>
        ),
        isPrimary: true,
      },
      { id: "supplier", header: t("columns.supplier"), cell: (trip) => trip.supplierName ?? "—" },
      { id: "lines", header: t("columns.lines"), align: "end", cell: (trip) => trip.lineCount },
      {
        id: "total",
        header: t("columns.total"),
        align: "end",
        cell: (trip) => <span className="tabular-nums">{formatUsd(trip.totalUsd)}</span>,
      },
    ],
    [t],
  );

  return {
    inProgress: open.page?.data ?? NO_TRIPS,
    saved: saved.page,
    isLoading: open.isLoading || saved.isLoading,
    columns,
    rowActions: (trip) => [
      { id: "view", label: t("view"), icon: Eye, href: `/purchases/${trip.id}` },
    ],
    setPage,
  };
}
