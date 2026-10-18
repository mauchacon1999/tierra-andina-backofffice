"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

export type UseMenuResult = {
  rootRef: RefObject<HTMLDivElement | null>;
  /** The list itself, which may be drawn outside the button so a clipping parent cannot hide it. */
  menuRef: RefObject<HTMLUListElement | null>;
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  onButtonKeyDown: (event: KeyboardEvent) => void;
  onMenuKeyDown: (event: KeyboardEvent) => void;
};

const items = (root: HTMLElement | null): HTMLElement[] =>
  root ? [...root.querySelectorAll<HTMLElement>("[role=menuitem]")] : [];

/**
 * Popup menu behavior (WAI-ARIA menu button): opens focused on the first item, arrows move,
 * Esc and Tab close (Esc returns focus to the button), a click outside closes it.
 */
export function useMenu(): UseMenuResult {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    items(menuRef.current ?? rootRef.current)[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return {
    rootRef,
    menuRef,
    isOpen,
    toggle: () => setIsOpen((open) => !open),
    close,
    onButtonKeyDown: (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIsOpen(true);
      }
    },
    onMenuKeyDown: (event) => {
      const list = items(menuRef.current ?? rootRef.current);
      const index = list.indexOf(document.activeElement as HTMLElement);
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        rootRef.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
      } else if (event.key === "Tab") {
        close();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        list[(index + step + list.length) % list.length]?.focus();
      }
    },
  };
}
