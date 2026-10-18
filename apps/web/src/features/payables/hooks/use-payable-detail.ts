"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  useDeletePayment,
  usePayable,
  useVoidPayable,
  type UsePayableResult,
} from "@/features/payables/api/use-payables";
import { useErrorMessage } from "@/i18n/use-error-message";

export type PayableDialog = "payment" | "terms" | null;

export type UsePayableDetailResult = UsePayableResult & {
  dialog: PayableDialog;
  openDialog: (dialog: Exclude<PayableDialog, null>) => void;
  closeDialog: () => void;
  /** Lines bought with the purchase form: corrected through the purchase, not here. */
  isFromPurchase: boolean;
  canPay: boolean;
  /** A supplies invoice without payments can still be edited and voided. */
  canEdit: boolean;
  canVoid: boolean;
  voidInvoice: () => Promise<void>;
  isVoiding: boolean;
  deletePayment: (paymentId: string) => Promise<void>;
  actionError: string | null;
};

/** An invoice's screen: what can be done with it and which dialog is open. */
export function usePayableDetail(): UsePayableDetailResult {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("payables.detail");
  const errorMessage = useErrorMessage();
  const result = usePayable(id);
  const voidPayable = useVoidPayable(id);
  const removePayment = useDeletePayment(id);
  const [dialog, setDialog] = useState<PayableDialog>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const payable = result.payable;

  const isOpen = payable !== undefined && payable.status !== "voided";
  const hasPayments = (payable?.payments.length ?? 0) > 0;
  const isFromPurchase = payable?.lines.some((line) => line.purchaseLine !== null) ?? false;

  const act = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(errorMessage(error, t("actionFailed")));
    }
  };

  return {
    ...result,
    dialog,
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    isFromPurchase,
    canPay: isOpen && payable.status !== "paid",
    canEdit: isOpen && !hasPayments && !isFromPurchase,
    canVoid: isOpen && !hasPayments,
    voidInvoice: () => act(() => voidPayable.run()),
    isVoiding: voidPayable.isRunning,
    deletePayment: (paymentId) => act(() => removePayment.run(paymentId)),
    actionError,
  };
}
