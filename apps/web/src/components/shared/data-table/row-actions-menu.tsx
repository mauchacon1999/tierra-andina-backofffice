"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

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

type MenuBox = { left: number; width: number; top?: number; bottom?: number };

/** Puts the menu on the screen, above a parent that clips its contents. */
function placeMenu(button: HTMLButtonElement): MenuBox {
  const rect = button.getBoundingClientRect();
  const width = 176;
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < 160 && rect.top > spaceBelow) {
    return { left, width, bottom: window.innerHeight - rect.top + 4 };
  }
  return { left, width, top: rect.bottom + 4 };
}

/** "⋯" button with the row's actions in a menu (Esc, outside click and arrows supported). */
export function RowActionsMenu({
  rowName,
  actions,
  onSelect,
}: RowActionsMenuProps): React.JSX.Element | null {
  const t = useTranslations("dataTable");
  const { rootRef, menuRef, isOpen, toggle, close, onButtonKeyDown, onMenuKeyDown } = useMenu();
  const [box, setBox] = useState<MenuBox | null>(null);
  // A row without actions (e.g. the owner in the users list) shows no "⋯" at all.
  const hasActions = actions.length > 0;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const button = rootRef.current?.querySelector("button");
    if (!(button instanceof HTMLButtonElement)) return;
    const place = (): void => setBox(placeMenu(button));
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen, rootRef]);

  if (!hasActions) return null;

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
      {isOpen &&
        (typeof document === "undefined"
          ? null
          : createPortal(
              <ul
                ref={menuRef}
                role="menu"
                aria-label={t("rowActions", { name: rowName })}
                onKeyDown={onMenuKeyDown}
                style={
                  box
                    ? {
                        position: "fixed",
                        zIndex: 40,
                        left: box.left,
                        width: box.width,
                        top: box.top,
                        bottom: box.bottom,
                      }
                    : undefined
                }
                className="overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
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
                        <Link
                          role="menuitem"
                          href={action.href}
                          className={className}
                          onClick={close}
                        >
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
              </ul>,
              document.body,
            ))}
    </div>
  );
}
