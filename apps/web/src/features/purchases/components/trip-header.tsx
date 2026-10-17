import type { TripDetail } from "@ta/validators";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatBs, formatDecimal, formatUsd } from "@/utils/format-number";

export type TripHeaderProps = {
  trip: TripDetail;
};

/** Day, status, the rates copied into the trip and its totals. */
export function TripHeader({ trip }: TripHeaderProps): React.JSX.Element {
  const isOpen = trip.status === "open";

  return (
    <Card tone={isOpen ? "success" : "default"} className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize">
          {formatBusinessDateLong(trip.businessDate)}
        </h2>
        <Badge tone={isOpen ? "success" : "neutral"}>{isOpen ? "Abierta" : "Cerrada"}</Badge>
      </div>
      {trip.note && <p className="text-sm text-muted">{trip.note}</p>}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Tasa BCV</dt>
        <dd className="text-right">{formatDecimal(trip.bcvRate, 2)} Bs</dd>
        <dt className="text-muted">Tasa de Coche</dt>
        <dd className="text-right">{formatDecimal(trip.marketRate, 2)} Bs</dd>
        <dt className="text-muted">Pagado a los puestos</dt>
        <dd className="text-right font-medium">{formatBs(trip.totalBs)}</dd>
        <dt className="text-muted">Costo real</dt>
        <dd className="text-right font-semibold">{formatUsd(trip.totalUsd)}</dd>
      </dl>
    </Card>
  );
}
