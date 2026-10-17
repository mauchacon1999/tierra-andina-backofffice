"use client";

import { useParams } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PurchaseLineCard } from "@/features/purchases/components/purchase-line-card";
import { PurchaseLineForm } from "@/features/purchases/components/purchase-line-form";
import { TripHeader } from "@/features/purchases/components/trip-header";
import { useTripScreen } from "@/features/purchases/hooks/use-trip-screen";

/** A purchase trip: add purchases while it is open, review them, close it. */
export function TripScreen(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const s = useTripScreen(id);

  if (s.error && !s.trip) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title="No se pudo abrir la jornada">
          {s.error.message}
        </Alert>
        <div className="flex gap-3">
          {s.error.status !== 404 && (
            <Button variant="secondary" onClick={s.retry}>
              Reintentar
            </Button>
          )}
          <ButtonLink href="/purchases" variant="secondary">
            Ver jornadas
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (s.isLoading || !s.trip) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  const { trip } = s;

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} />
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      {s.isOpen && s.editingLineId === null && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Agregar compra</h2>
          <PurchaseLineForm trip={trip} />
        </Card>
      )}

      <section className="space-y-3" aria-label="Compras de la jornada">
        <h2 className="font-semibold">Compras ({trip.lines.length})</h2>
        {trip.lines.length === 0 && <p className="text-sm text-muted">Aún no hay compras.</p>}
        {trip.lines.map((line) =>
          s.editingLineId === line.id ? (
            <Card key={line.id} tone="muted" className="space-y-3">
              <h3 className="font-semibold">Editar {line.productName}</h3>
              <PurchaseLineForm
                trip={trip}
                line={line}
                onDone={() => s.setEditingLineId(null)}
                onCancel={() => s.setEditingLineId(null)}
              />
            </Card>
          ) : (
            <PurchaseLineCard
              key={line.id}
              line={line}
              canEdit={s.isOpen && s.editingLineId === null}
              onEdit={() => s.setEditingLineId(line.id)}
              onDelete={() => s.deleteLine(line.id)}
              isDeleting={s.deletingLineId === line.id}
            />
          ),
        )}
      </section>

      {s.isOpen && (
        <Card className="space-y-3">
          <p className="text-sm text-muted">
            Al cerrar la jornada ya no se pueden agregar ni cambiar compras.
          </p>
          <ConfirmButton
            question="¿Cerrar la jornada?"
            confirmLabel="Cerrar jornada"
            variant="primary"
            onConfirm={s.closeTrip}
            isLoading={s.isClosing}
            loadingText="Cerrando…"
          >
            Cerrar jornada
          </ConfirmButton>
        </Card>
      )}
    </div>
  );
}
