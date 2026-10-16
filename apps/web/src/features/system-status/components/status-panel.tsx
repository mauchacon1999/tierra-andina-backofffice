"use client";

import { StatusCard } from "@/features/system-status/components/status-card";
import { useSystemStatus } from "@/features/system-status/hooks/use-system-status";

export function StatusPanel(): React.JSX.Element {
  const { api, db, checkedAt, refresh } = useSystemStatus();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard title="API" state={api} />
        <StatusCard title="Base de datos" state={db} />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          {checkedAt
            ? `Última comprobación: ${checkedAt.toLocaleTimeString("es-VE")}`
            : "Comprobando…"}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none active:bg-emerald-900"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
