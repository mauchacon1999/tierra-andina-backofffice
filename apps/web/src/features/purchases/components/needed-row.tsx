"use client";

import type { ShoppingListItem } from "@ta/validators";
import { GripVertical, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

export type NeededRowProps = {
  item: ShoppingListItem;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onGripPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onGripPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onGripPointerUp: () => void;
  onBuy: (productId: string) => void;
};

/** One product still to buy: its place in the walk, its name, and the note. */
export function NeededRow({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
  onBuy,
}: NeededRowProps): React.JSX.Element {
  const t = useTranslations("purchases.needed");
  const position = index + 1;

  return (
    <li
      data-index={index}
      aria-posinset={position}
      aria-setsize={total}
      className="flex items-center gap-1 px-1 py-1"
    >
      <IconButton
        label={t("move", { product: item.productName })}
        className="cursor-grab touch-none text-muted active:cursor-grabbing"
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerUp}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          if (event.key === "ArrowUp") onMoveUp();
          else onMoveDown();
        }}
      >
        <GripVertical aria-hidden className="size-5" />
      </IconButton>
      <span
        aria-hidden
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-sm font-semibold text-warning-text tabular-nums"
      >
        {position}
      </span>
      <ShoppingCart aria-hidden className="size-5 shrink-0 text-warning-text" />
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate text-base font-semibold">{item.productName}</p>
        {item.note && <p className="truncate text-sm text-muted">{item.note}</p>}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        aria-label={t("buyProduct", { product: item.productName })}
        onClick={() => onBuy(item.productId)}
      >
        {t("buy")}
      </Button>
    </li>
  );
}
