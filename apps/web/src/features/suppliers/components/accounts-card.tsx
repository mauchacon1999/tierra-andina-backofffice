"use client";

import type { SupplierPaymentAccount } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";

export type AccountsCardProps = {
  accounts: SupplierPaymentAccount[];
  onAdd: () => void;
  onEdit: (account: SupplierPaymentAccount) => void;
  onDeactivate: (account: SupplierPaymentAccount) => Promise<void>;
};

/** The supplier's pago móvil accounts; a removed one stays listed (past payments keep it). */
export function AccountsCard({
  accounts,
  onAdd,
  onEdit,
  onDeactivate,
}: AccountsCardProps): React.JSX.Element {
  const t = useTranslations("suppliers.accounts");

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("title")}</h2>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          {t("add")}
        </Button>
      </div>
      {accounts.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
      <ul className="divide-y divide-border">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className={account.isActive ? undefined : "opacity-60"}>
              <p className="font-medium">
                {account.bankName}{" "}
                <span className="text-sm font-normal text-muted">({account.bankCode})</span>
              </p>
              <p className="text-sm tabular-nums text-muted">
                {account.phone} · {account.idDocument}
              </p>
            </div>
            {account.isActive ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(account)}>
                  {t("edit")}
                </Button>
                <ConfirmButton
                  size="sm"
                  question={t("deactivateQuestion")}
                  onConfirm={() => onDeactivate(account)}
                >
                  {t("deactivate")}
                </ConfirmButton>
              </div>
            ) : (
              <Badge>{t("inactive")}</Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
