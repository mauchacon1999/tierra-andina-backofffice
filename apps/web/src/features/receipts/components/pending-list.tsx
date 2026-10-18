"use client";

import type { ReceiptLine, ReceiptStatus, ReceiptToBuy } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useRef, type PointerEvent } from "react";

import { PendingRow } from "@/features/receipts/components/pending-row";
import type { ReceiptBoard } from "@/features/receipts/helpers/group-receipt";
import { useStoredOrder } from "@/hooks/use-stored-order";

export type PendingListProps = {
  tripId: string;
  board: ReceiptBoard;
  onMark: (line: ReceiptLine, status: ReceiptStatus) => void;
  markingLineId: string | null;
};

type PendingEntry = ReceiptToBuy | ReceiptLine;

function entries(board: ReceiptBoard): PendingEntry[] {
  return [...board.toBuy, ...board.onTheWay, ...board.missing];
}

/** Compact pending list. Drag the handle, or use the arrow keys, to put it in the receiver's order. */
export function PendingList({
  tripId,
  board,
  onMark,
  markingLineId,
}: PendingListProps): React.JSX.Element {
  const t = useTranslations("receipts");
  const listRef = useRef<HTMLUListElement>(null);
  const dragFrom = useRef<number | null>(null);
  const items = entries(board);
  const byId = new Map(items.map((item) => [item.id, item]));
  const order = useStoredOrder(
    `ta.receipt.pending-order.${tripId}`,
    items.map((item) => item.id),
  );
  const ordered = order.ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });

  const rowAt = (event: PointerEvent<HTMLButtonElement>): number | null => {
    const list = listRef.current;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest("li");
    if (!list || !hit || !list.contains(hit)) return null;
    const index = Number((hit as HTMLElement).dataset.index);
    return Number.isInteger(index) ? index : null;
  };

  return (
    <>
      <p className="text-sm text-muted">{t("reorderHint")}</p>
      <ul
        ref={listRef}
        className="divide-y divide-border rounded-2xl border border-border bg-surface"
      >
        {ordered.map((item, index) => (
          <li key={item.id} data-index={index} className="px-1">
            <PendingRow
              item={item}
              isSaving={markingLineId === item.id}
              onMark={onMark}
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
            />
          </li>
        ))}
      </ul>
    </>
  );
}
