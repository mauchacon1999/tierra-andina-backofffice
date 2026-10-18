"use client";

import { useTranslations } from "next-intl";
import { useRef, type PointerEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NeededRow } from "@/features/purchases/components/needed-row";
import { useShoppingList } from "@/features/shopping-list/api/use-shopping-list";
import { useStoredOrder } from "@/hooks/use-stored-order";
import { useErrorMessage } from "@/i18n/use-error-message";

const ORDER_KEY = "ta.purchases.needed-order";

export type TripNeededListProps = {
  onBuy: (productId: string) => void;
};

/** What is still to buy, in the order the buyer walks the market. */
export function TripNeededList({ onBuy }: TripNeededListProps): React.JSX.Element {
  const list = useShoppingList();
  const t = useTranslations("purchases.needed");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const listRef = useRef<HTMLUListElement>(null);
  const dragFrom = useRef<number | null>(null);
  const order = useStoredOrder(
    ORDER_KEY,
    list.items.map((item) => item.id),
  );
  const byId = new Map(list.items.map((item) => [item.id, item]));
  const items = order.ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });

  const rowAt = (event: PointerEvent<HTMLButtonElement>): number | null => {
    const root = listRef.current;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest("li");
    if (!root || !hit || !root.contains(hit)) return null;
    const index = Number((hit as HTMLElement).dataset.index);
    return Number.isInteger(index) ? index : null;
  };

  return (
    <section aria-label={t("title")} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {!list.isLoading && !list.error && (
          <Badge tone={items.length > 0 ? "warning" : "success"}>
            {t("count", { count: items.length })}
          </Badge>
        )}
      </div>
      {list.error && (
        <Alert tone="error" title={t("loadFailed")}>
          <p>{errorMessage(list.error, list.error.message)}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={list.retry}>
            {tc("retry")}
          </Button>
        </Alert>
      )}
      {list.isLoading && (
        <p role="status" className="text-sm text-muted">
          {tc("loading")}
        </p>
      )}
      {!list.isLoading && items.length === 0 && !list.error && (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}
      {items.length > 0 && (
        <>
          <p className="text-sm text-muted">{t("hint")}</p>
          <ul
            ref={listRef}
            className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface"
          >
            {items.map((item, index) => (
              <NeededRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                onMoveUp={() => order.move(index, index - 1)}
                onMoveDown={() => order.move(index, index + 1)}
                onGripPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragFrom.current = index;
                }}
                onGripPointerMove={(event) => {
                  const from = dragFrom.current;
                  if (from === null) return;
                  const to = rowAt(event);
                  if (to === null || to === from) return;
                  order.move(from, to);
                  dragFrom.current = to;
                }}
                onGripPointerUp={() => {
                  dragFrom.current = null;
                }}
                onBuy={onBuy}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
