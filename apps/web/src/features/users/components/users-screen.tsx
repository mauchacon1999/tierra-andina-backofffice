"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CreateUserForm, EditUserForm, PasswordForm } from "@/features/users/components/user-forms";
import { useUsersScreen } from "@/features/users/hooks/use-users-screen";
import { useErrorMessage } from "@/i18n/use-error-message";

/** The store's people: create managers and receivers, edit, change password, (de)activate. */
export function UsersScreen(): React.JSX.Element {
  const s = useUsersScreen();
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const dialog = s.dialog;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={s.openCreate}>{t("new")}</Button>
      </div>
      {s.notice && <Alert tone="success">{s.notice}</Alert>}
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      <DataTable
        label={t("label")}
        data={s.users}
        columns={s.columns}
        getRowId={(user) => user.id}
        rowName={(user) => user.name}
        rowActions={s.rowActions}
        rowClassName={(user) => (user.isActive ? undefined : "opacity-60")}
        sorting={{ mode: "client" }}
        isLoading={s.isLoading}
        error={
          s.error && {
            title: t("loadFailed"),
            message: errorMessage(s.error, s.error.message),
            onRetry: s.retry,
          }
        }
        empty={<p className="text-muted">{t("empty")}</p>}
      />
      <Dialog
        isOpen={dialog !== null}
        onClose={s.closeDialog}
        title={
          dialog?.kind === "edit"
            ? t("editTitle", { name: dialog.user.name })
            : dialog?.kind === "password"
              ? t("passwordTitle", { name: dialog.user.name })
              : t("new")
        }
        closeLabel={tc("close")}
      >
        {dialog?.kind === "create" && (
          <CreateUserForm
            onDone={() => {
              s.closeDialog();
              s.setNotice(t("created"));
            }}
          />
        )}
        {dialog?.kind === "edit" && <EditUserForm user={dialog.user} onDone={s.closeDialog} />}
        {dialog?.kind === "password" && (
          <PasswordForm
            user={dialog.user}
            onDone={() => {
              s.closeDialog();
              s.setNotice(t("passwordSaved", { name: dialog.user.name }));
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
