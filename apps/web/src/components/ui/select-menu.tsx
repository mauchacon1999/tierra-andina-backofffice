"use client";

import { useSelect } from "downshift";
import { Check, ChevronDown } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/utils/cn";

export type SelectMenuOption = {
  value: string;
  label: string;
  /** Classes for the color dot in front of the label. */
  dotClassName?: string;
};

export type SelectMenuProps = {
  /** Accessible name. The closed control shows the selected label, not this text. */
  label: string;
  options: SelectMenuOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  /**
   * `field` is the labelled button. `avatar` is only the person's initial in a circle;
   * the list with the full names opens when that circle is pressed.
   */
  appearance?: "field" | "avatar";
};

const AVATAR = [
  "bg-info-soft text-info-text",
  "bg-chip-soft text-chip-text",
  "bg-primary-soft text-primary-text",
  "bg-warning-soft text-warning-text",
] as const;

/** First letter of a name, uppercased, for the round avatar. */
export function personInitial(name: string): string {
  const first = [...name.trim()][0];
  return first ? first.toLocaleUpperCase("es-VE") : "";
}

/** Same person keeps the same circle color. */
export function avatarClass(name: string): string {
  let hash = 0;
  for (const char of name) hash += char.codePointAt(0) ?? 0;
  return AVATAR[hash % AVATAR.length] ?? AVATAR[0];
}

type MenuBox = { left: number; width: number; top?: number; bottom?: number };

function placeMenu(button: HTMLButtonElement): MenuBox {
  const rect = button.getBoundingClientRect();
  const width = Math.max(rect.width, 176);
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < 200 && rect.top > spaceBelow) {
    return { left, width, bottom: window.innerHeight - rect.top + 4 };
  }
  return { left, width, top: rect.bottom + 4 };
}

/**
 * A button that opens a styled list. Built on Downshift's select, which the app already
 * uses for the product combobox, so the menu matches the rest of the screen.
 */
export function SelectMenu({
  label,
  options,
  value,
  onValueChange,
  className,
  buttonClassName,
  appearance = "field",
}: SelectMenuProps): React.JSX.Element {
  const [box, setBox] = useState<MenuBox | null>(null);
  const selected = options.find((option) => option.value === value) ?? null;
  const menu = useSelect({
    items: options,
    selectedItem: selected,
    itemToString: (item) => item?.label ?? "",
    itemToKey: (item) => item?.value ?? "",
    // The library's default announcement is English. The list itself is labelled.
    getA11yStatusMessage: () => "",
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem && selectedItem.value !== value) onValueChange(selectedItem.value);
    },
  });

  const toggleProps = menu.getToggleButtonProps({ "aria-label": label });

  useLayoutEffect(() => {
    if (!menu.isOpen) return;
    const button = document.getElementById(toggleProps.id);
    if (!(button instanceof HTMLButtonElement)) return;
    const place = (): void => setBox(placeMenu(button));
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [menu.isOpen, toggleProps.id]);

  const list = (
    <ul
      {...menu.getMenuProps()}
      hidden={!menu.isOpen}
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
      className="max-h-60 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
    >
      {menu.isOpen &&
        options.map((option, index) => (
          <li
            key={option.value}
            {...menu.getItemProps({ item: option, index })}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm",
              menu.highlightedIndex === index && "bg-surface-muted",
              option.value === value && "font-medium",
            )}
          >
            {appearance === "avatar" ? (
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  avatarClass(option.label),
                )}
              >
                {personInitial(option.label)}
              </span>
            ) : (
              option.dotClassName && (
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-full", option.dotClassName)}
                />
              )
            )}
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.value === value && (
              <Check aria-hidden className="size-4 shrink-0 text-primary" />
            )}
          </li>
        ))}
    </ul>
  );

  return (
    <div className={className}>
      <button
        {...toggleProps}
        type="button"
        className={cn(
          "focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
          appearance === "avatar"
            ? cn(
                "inline-flex size-11 items-center justify-center rounded-full text-sm font-semibold",
                avatarClass(selected?.label ?? ""),
                menu.isOpen && "ring-2 ring-focus",
              )
            : cn(
                "inline-flex min-h-11 w-full items-center justify-between gap-1.5 border px-3 text-left text-sm font-medium",
                buttonClassName,
              ),
        )}
      >
        {appearance === "avatar" ? (
          <span aria-hidden>{personInitial(selected?.label ?? "")}</span>
        ) : (
          <>
            <span className="truncate">{selected?.label}</span>
            <ChevronDown
              aria-hidden
              className={cn("size-4 shrink-0", menu.isOpen && "rotate-180")}
            />
          </>
        )}
      </button>
      {typeof document === "undefined" ? list : createPortal(list, document.body)}
    </div>
  );
}
