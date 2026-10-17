"use client";

import { useState } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export type ConfirmButtonProps = {
  /** Button text ("Eliminar", "Cerrar jornada"). */
  children: string;
  /** What will happen, asked before acting ("¿Eliminar esta compra?"). */
  question: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: ButtonVariant;
  /** Size of the first button; the confirmation buttons are always small. */
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
};

/**
 * Two-step button for destructive or irreversible actions (docs/design-system.md §4): the
 * first tap shows the question with "Confirmar" and "Cancelar" in place, no modal.
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel = "Confirmar",
  onConfirm,
  variant = "danger",
  size = "md",
  isLoading = false,
  loadingText,
  className,
}: ConfirmButtonProps): React.JSX.Element {
  const [isAsking, setIsAsking] = useState(false);

  if (!isAsking) {
    return (
      <Button
        variant={variant === "danger" ? "secondary" : variant}
        size={size}
        className={className}
        onClick={() => setIsAsking(true)}
      >
        {children}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={question}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <p className="text-sm font-medium">{question}</p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAsking(false)}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          variant={variant}
          size="sm"
          isLoading={isLoading}
          {...(loadingText ? { loadingText } : {})}
          onClick={async () => {
            await onConfirm();
            setIsAsking(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
