"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { IconButton } from "@/components/ui/icon-button";
import type { RowAction } from "@/components/shared/data-table/types";
import { useMenu } from "@/components/shared/data-table/use-menu";
import { cn } from "@/utils/cn";

export type RowActionsMenuProps = {
  /** Row name for the button's accessible name ("Acciones de Tomate perita"). */
  rowName: string;
  actions: RowAction[];
  onSelect: (action: RowAction) => void;
};

const ITEM =
  "flex w-full min-h-11 items-center gap-2 px-3 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none";

/** "⋯" button with the row's actions in a menu (Esc, outside click and arrows supported). */
export function RowActionsMenu({
  rowName,
  actions,
  onSelect,
}: RowActionsMenuProps): React.JSX.Element {
  const t = useTranslations("dataTable");
  const { rootRef, isOpen, toggle, close, onButtonKeyDown, onMenuKeyDown } = useMenu();

  return (
    <div ref={rootRef} className="relative inline-block">
      <IconButton
        label={t("rowActions", { name: rowName })}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
        onKeyDown={onButtonKeyDown}
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </IconButton>
      {isOpen && (
        <ul
          role="menu"
          aria-label={t("rowActions", { name: rowName })}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-40 mt-1 min-w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            const className = cn(ITEM, action.tone === "danger" && "text-danger-text");
            const content = (
              <>
                {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
                {action.label}
              </>
            );
            return (
              <li key={action.id} role="none">
                {action.href ? (
                  <Link role="menuitem" href={action.href} className={className} onClick={close}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={className}
                    onClick={() => {
                      close();
                      onSelect(action);
                    }}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
