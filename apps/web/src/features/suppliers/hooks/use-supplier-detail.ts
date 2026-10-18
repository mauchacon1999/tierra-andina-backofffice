"use client";

import type { SupplierPaymentAccount } from "@ta/validators";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  useDeactivateAccount,
  useSupplier,
  type UseSupplierResult,
} from "@/features/suppliers/api/use-suppliers";
import { useErrorMessage } from "@/i18n/use-error-message";

export type AccountDialog =
  { kind: "add" } | { kind: "edit"; account: SupplierPaymentAccount } | null;

export type UseSupplierDetailResult = UseSupplierResult & {
  accountDialog: AccountDialog;
  openAddAccount: () => void;
  openEditAccount: (account: SupplierPaymentAccount) => void;
  closeAccountDialog: () => void;
  deactivate: (account: SupplierPaymentAccount) => Promise<void>;
  /** Last confirmation ("Cambios guardados"). */
  notice: string | null;
  showSaved: () => void;
  actionError: string | null;
};

/** A supplier's screen: its data, its pago móvil accounts and the account dialog. */
export function useSupplierDetail(): UseSupplierDetailResult {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("suppliers");
  const errorMessage = useErrorMessage();
  const supplier = useSupplier(id);
  const deactivateAccount = useDeactivateAccount(id);
  const [accountDialog, setAccountDialog] = useState<AccountDialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  return {
    ...supplier,
    accountDialog,
    openAddAccount: () => setAccountDialog({ kind: "add" }),
    openEditAccount: (account) => setAccountDialog({ kind: "edit", account }),
    closeAccountDialog: () => setAccountDialog(null),
    deactivate: async (account) => {
      setActionError(null);
      try {
        await deactivateAccount.run(account.id);
      } catch (error) {
        setActionError(errorMessage(error, t("accounts.deactivateFailed")));
      }
    },
    notice,
    showSaved: () => setNotice(t("saved")),
    actionError,
  };
}
