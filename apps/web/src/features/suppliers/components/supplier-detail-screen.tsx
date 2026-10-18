"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { AccountForm } from "@/features/suppliers/components/account-form";
import { AccountsCard } from "@/features/suppliers/components/accounts-card";
import { EditSupplierForm } from "@/features/suppliers/components/supplier-forms";
import { useSupplierDetail } from "@/features/suppliers/hooks/use-supplier-detail";
import { useErrorMessage } from "@/i18n/use-error-message";

/** One supplier: its data (editable) and its pago móvil accounts. */
export function SupplierDetailScreen(): React.JSX.Element {
  const s = useSupplierDetail();
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const supplier = s.supplier;
  const dialog = s.accountDialog;

  if (s.error && !supplier) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title={t("detailFailed")}>
          {errorMessage(s.error, s.error.message)}
        </Alert>
        <div className="flex gap-3">
          {s.error.status !== 404 && (
            <Button variant="secondary" onClick={s.retry}>
              {tc("retry")}
            </Button>
          )}
          <ButtonLink href="/suppliers" variant="secondary">
            {t("back")}
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (!supplier) {
    return (
      <p className="flex items-center gap-2 text-muted">
        <Spinner />
        {tc("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ButtonLink href="/suppliers" variant="ghost" size="sm">
        {t("back")}
      </ButtonLink>
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">{supplier.name}</h1>
      {s.notice && <Alert tone="success">{s.notice}</Alert>}
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("dataTitle")}</h2>
          <EditSupplierForm key={supplier.id} supplier={supplier} onDone={s.showSaved} />
        </Card>
        <AccountsCard
          accounts={supplier.accounts}
          onAdd={s.openAddAccount}
          onEdit={s.openEditAccount}
          onDeactivate={s.deactivate}
        />
      </div>
      <Dialog
        isOpen={dialog !== null}
        onClose={s.closeAccountDialog}
        title={dialog?.kind === "edit" ? t("accounts.editTitle") : t("accounts.addTitle")}
        closeLabel={tc("close")}
      >
        {dialog && (
          <AccountForm
            supplierId={supplier.id}
            account={dialog.kind === "edit" ? dialog.account : undefined}
            onDone={s.closeAccountDialog}
          />
        )}
      </Dialog>
    </div>
  );
}
