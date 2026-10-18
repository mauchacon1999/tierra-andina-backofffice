"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { MobilePaymentPanel } from "@/features/payables/components/mobile-payment-panel";
import { PayableLinesCard } from "@/features/payables/components/payable-lines-card";
import { PayableSummaryCard } from "@/features/payables/components/payable-summary-card";
import { PaymentForm } from "@/features/payables/components/payment-form";
import { PaymentsCard } from "@/features/payables/components/payments-card";
import { TermsForm } from "@/features/payables/components/terms-form";
import { usePayableDetail } from "@/features/payables/hooks/use-payable-detail";
import { useErrorMessage } from "@/i18n/use-error-message";

/** One invoice: what is owed, its lines and payments, pay it (pago móvil copy), edit, void. */
export function PayableDetailScreen(): React.JSX.Element {
  const s = usePayableDetail();
  const td = useTranslations("payables.detail");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const payable = s.payable;

  if (s.error && !payable) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title={td("loadFailed")}>
          {errorMessage(s.error, s.error.message)}
        </Alert>
        <ButtonLink href="/payables" variant="secondary">
          {td("back")}
        </ButtonLink>
      </div>
    );
  }
  if (!payable) {
    return (
      <p className="flex items-center gap-2 text-muted">
        <Spinner />
        {tc("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ButtonLink href="/payables" variant="ghost" size="sm">
        {td("back")}
      </ButtonLink>
      <PayableSummaryCard payable={payable} />
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      <div className="flex flex-wrap gap-2">
        {s.canPay && <Button onClick={() => s.openDialog("payment")}>{td("pay")}</Button>}
        {s.canPay && (
          <Button variant="secondary" onClick={() => s.openDialog("settle")}>
            {td("markPaid")}
          </Button>
        )}
        {payable.status !== "voided" && (
          <Button variant="secondary" onClick={() => s.openDialog("terms")}>
            {td("terms")}
          </Button>
        )}
        {s.canEdit && (
          <ButtonLink href={`/payables/${payable.id}/edit`} variant="secondary">
            {td("edit")}
          </ButtonLink>
        )}
        {s.canVoid && (
          <ConfirmButton
            question={td("voidQuestion")}
            onConfirm={s.voidInvoice}
            isLoading={s.isVoiding}
            loadingText={td("voiding")}
          >
            {td("void")}
          </ConfirmButton>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <PayableLinesCard payable={payable} />
          <PaymentsCard
            payable={payable}
            onDelete={payable.status === "voided" ? null : s.deletePayment}
          />
        </div>
        {s.canPay && <MobilePaymentPanel payableId={payable.id} supplierId={payable.supplierId} />}
      </div>
      <Dialog
        isOpen={s.dialog !== null}
        onClose={s.closeDialog}
        title={
          s.dialog === "terms" ? td("terms") : s.dialog === "settle" ? td("markPaid") : td("pay")
        }
        closeLabel={tc("close")}
      >
        {s.dialog === "payment" && <PaymentForm payable={payable} onDone={s.closeDialog} />}
        {s.dialog === "settle" && <PaymentForm payable={payable} onDone={s.closeDialog} settle />}
        {s.dialog === "terms" && <TermsForm payable={payable} onDone={s.closeDialog} />}
      </Dialog>
    </div>
  );
}
