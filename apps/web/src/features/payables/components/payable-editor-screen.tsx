"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button-link";
import { Spinner } from "@/components/ui/spinner";
import { usePayable } from "@/features/payables/api/use-payables";
import { PayableForm } from "@/features/payables/components/payable-form";
import { useErrorMessage } from "@/i18n/use-error-message";

/** "Nueva factura": the form, then the new invoice's screen. */
export function NewPayableScreen(): React.JSX.Element {
  const router = useRouter();
  const t = useTranslations("payables.form");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("newTitle")}</h1>
      <PayableForm onDone={(payable) => router.push(`/payables/${payable.id}`)} />
    </div>
  );
}

/** "Editar": the same form with the invoice's contents (no payments yet). */
export function EditPayableScreen(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { payable, error } = usePayable(id);
  const t = useTranslations("payables.form");
  const td = useTranslations("payables.detail");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

  if (error && !payable) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title={td("loadFailed")}>
          {errorMessage(error, error.message)}
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">
        {t("editTitle", { code: payable.code })}
      </h1>
      <PayableForm payable={payable} onDone={() => router.push(`/payables/${payable.id}`)} />
    </div>
  );
}
