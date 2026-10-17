"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export type ConfirmDialogProps = {
  isOpen: boolean;
  /** "¿Eliminar Tomate perita?" — also the dialog's name. */
  question: string;
  /** What happens, when the question is not enough ("Esta acción no se puede deshacer"). */
  detail?: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  isLoading?: boolean;
  loadingText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Modal confirmation for actions started from a menu (row actions), where an inline
 * ConfirmButton has no room. "Cancelar" first, the action last (docs/design-system.md §4). */
export function ConfirmDialog({
  isOpen,
  question,
  detail,
  confirmLabel,
  tone = "danger",
  isLoading = false,
  loadingText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  const t = useTranslations("common");

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={question} closeLabel={t("close")}>
      <div className="space-y-4">
        {detail && <p className="text-sm text-muted">{detail}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button
            variant={tone}
            onClick={onConfirm}
            isLoading={isLoading}
            {...(loadingText ? { loadingText } : {})}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
