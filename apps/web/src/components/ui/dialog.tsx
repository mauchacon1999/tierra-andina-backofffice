"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/utils/cn";

const VARIANTS = {
  // Centered box for forms ("Editar compra").
  center: "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl",
  // Full-height panel from the left edge (mobile menu).
  drawer: "my-0 mr-auto ml-0 h-full max-h-none w-72 max-w-[85vw]",
} as const;

export type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Accessible name of the close button ("Cerrar"). */
  closeLabel: string;
  variant?: keyof typeof VARIANTS;
  /** Show the title visually (the dialog is always labelled by it). */
  showTitle?: boolean;
  /** No padding around the content (it brings its own, like the menu). */
  flush?: boolean;
  children: ReactNode;
};

/**
 * Modal on the native <dialog> (docs/design-system.md): the browser traps focus, closes on Esc
 * and restores focus on close. A click on the backdrop closes it too.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  closeLabel,
  variant = "center",
  showTitle = true,
  flush = false,
  children,
}: DialogProps): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        // The <dialog> itself only receives clicks on its backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "bg-surface p-0 text-foreground shadow-lg backdrop:bg-foreground/40",
        VARIANTS[variant],
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <h2 className={cn("text-lg font-semibold", !showTitle && "sr-only")}>{title}</h2>
          <IconButton label={closeLabel} onClick={onClose}>
            <X aria-hidden className="size-5" />
          </IconButton>
        </div>
        <div className={cn("flex-1 overflow-y-auto", !flush && "p-4")}>{isOpen && children}</div>
      </div>
    </dialog>
  );
}
