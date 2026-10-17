"use client";

import type { Trip } from "@ta/validators";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type {
  DataColumn,
  DataTablePagination,
  RowAction,
} from "@/components/shared/data-table/types";
import { Badge } from "@/components/ui/badge";
import { useTrips, type UseTripsResult } from "@/features/purchases/api/use-trips";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatBs, formatUsd } from "@/utils/format-number";

export const TRIPS_PAGE_SIZE = 20;

export type UseTripTableResult = Pick<UseTripsResult, "page" | "isLoading" | "error" | "retry"> & {
  columns: DataColumn<Trip>[];
  rowActions: (trip: Trip) => RowAction[];
  pagination: DataTablePagination | undefined;
};

/** Purchase trips page by page (open ones first, newest first: the API's order). */
export function useTripTable(): UseTripTableResult {
  const t = useTranslations("purchases");
  const tc = useTranslations("common");
  const [pageNumber, setPageNumber] = useState(1);
  const trips = useTrips({ page: pageNumber, pageSize: TRIPS_PAGE_SIZE });

  const columns = useMemo(
    (): DataColumn<Trip>[] => [
      {
        id: "date",
        header: t("trips.columns.date"),
        cell: (trip) => (
          <Link
            href={`/purchases/${trip.id}`}
            className="font-medium text-primary-text capitalize hover:underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
          >
            {formatBusinessDateLong(trip.businessDate)}
          </Link>
        ),
        isPrimary: true,
      },
      {
        id: "status",
        header: t("trips.columns.status"),
        cell: (trip) => (
          <Badge tone={trip.status === "open" ? "success" : "neutral"}>
            {t(`status.${trip.status}`)}
          </Badge>
        ),
      },
      {
        id: "lines",
        header: t("trips.columns.lines"),
        cell: (trip) => trip.lineCount,
        align: "end",
      },
      {
        id: "totalUsd",
        header: t("trips.columns.totalUsd"),
        cell: (trip) => formatUsd(trip.totalUsd),
        align: "end",
      },
      {
        id: "totalBs",
        header: t("trips.columns.totalBs"),
        cell: (trip) => formatBs(trip.totalBs),
        align: "end",
      },
      { id: "note", header: t("trips.columns.note"), cell: (trip) => trip.note ?? tc("empty") },
    ],
    [t, tc],
  );

  return {
    page: trips.page,
    isLoading: trips.isLoading,
    error: trips.error,
    retry: trips.retry,
    columns,
    rowActions: (trip) => [
      { id: "open", label: t("trips.open"), icon: Eye, href: `/purchases/${trip.id}` },
    ],
    pagination: trips.page && {
      page: trips.page.page,
      pageSize: trips.page.pageSize,
      total: trips.page.total,
      onPageChange: setPageNumber,
    },
  };
}
