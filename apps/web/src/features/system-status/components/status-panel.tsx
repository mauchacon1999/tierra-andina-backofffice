"use client";

import { Button } from "@/components/ui/button";
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

      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          {checkedAt
            ? `Última comprobación: ${checkedAt.toLocaleTimeString("es-VE")}`
            : "Comprobando…"}
        </span>
        <Button variant="secondary" size="sm" onClick={refresh}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
