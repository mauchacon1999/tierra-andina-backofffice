"use client";

import { useLayoutEffect, useState, type CSSProperties } from "react";

/** Gap between the trigger and the panel, and from the panel to the screen edges. */
const GAP = 4;
const EDGE = 8;

export type UsePopoverOptions = {
  /** Panel width in px (also used to keep it on screen). */
  width: number;
  /** Expected panel height in px: opens upwards when it does not fit below. */
  height: number;
};

export type UsePopoverResult = {
  isOpen: boolean;
  open: () => void;
  /** Closes and gives the focus back to the trigger. */
  close: () => void;
  toggle: () => void;
  /** Callback refs for the trigger button and the panel. */
  setTrigger: (node: HTMLButtonElement | null) => void;
  setPanel: (node: HTMLDivElement | null) => void;
  /** Fixed position next to the trigger (undefined until placed). */
  panelStyle: CSSProperties | undefined;
};

/** Where the panel goes: under the trigger, or above it when there is no room below. */
export function placePopover(
  trigger: DOMRect,
  viewport: { width: number; height: number },
  size: UsePopoverOptions,
): CSSProperties {
  const width = Math.min(size.width, viewport.width - EDGE * 2);
  const left = Math.max(EDGE, Math.min(trigger.left, viewport.width - width - EDGE));
  const spaceBelow = viewport.height - trigger.bottom;
  if (spaceBelow < size.height + GAP && trigger.top > spaceBelow) {
    return {
      position: "fixed",
      zIndex: 40,
      left,
      width,
      bottom: viewport.height - trigger.top + GAP,
    };
  }
  return { position: "fixed", zIndex: 40, left, width, top: trigger.bottom + GAP };
}

/**
 * A panel anchored to a button (date picker, menus): fixed next to the trigger and kept there
 * on scroll and resize; Esc or a press outside closes it. Esc returns the focus to the trigger.
 */
export function usePopover(size: UsePopoverOptions): UsePopoverResult {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>();
  // Elements in state (set by callback refs): render never reads a ref.
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const { width, height } = size;

  useLayoutEffect(() => {
    if (!isOpen || !trigger) return;
    const place = (): void => {
      setPanelStyle(
        placePopover(
          trigger.getBoundingClientRect(),
          { width: window.innerWidth, height: window.innerHeight },
          { width, height },
        ),
      );
    };
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (trigger.contains(target) || panel?.contains(target)) return;
      setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      trigger.focus();
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, trigger, panel, width, height]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => {
      setIsOpen(false);
      trigger?.focus();
    },
    toggle: () => setIsOpen((current) => !current),
    setTrigger,
    setPanel,
    panelStyle,
  };
}
