"use client";

import type { StaffUser } from "@ta/validators";
import { KeyRound, Pencil, Power } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { Badge } from "@/components/ui/badge";
import { useUpdateUser, useUsers, type UseUsersResult } from "@/features/users/api/use-users";
import { useErrorMessage } from "@/i18n/use-error-message";

export type UserDialog =
  | { kind: "create" }
  | { kind: "edit"; user: StaffUser }
  | { kind: "password"; user: StaffUser }
  | null;

export type UseUsersScreenResult = UseUsersResult & {
  columns: DataColumn<StaffUser>[];
  rowActions: (user: StaffUser) => RowAction[];
  dialog: UserDialog;
  openCreate: () => void;
  closeDialog: () => void;
  /** Last confirmation to show ("Usuario creado…", "Contraseña cambiada…"). */
  notice: string | null;
  setNotice: (notice: string | null) => void;
  actionError: string | null;
};

/** The owner's users screen: the table, its actions and which dialog is open. */
export function useUsersScreen(): UseUsersScreenResult {
  const t = useTranslations("users");
  const tr = useTranslations("auth.roles");
  const errorMessage = useErrorMessage();
  const users = useUsers();
  const update = useUpdateUser();
  const [dialog, setDialog] = useState<UserDialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns = useMemo(
    (): DataColumn<StaffUser>[] => [
      {
        id: "name",
        header: t("columns.name"),
        cell: (user) => (
          <span className="inline-flex flex-wrap items-center gap-2 font-medium">
            {user.name}
            {user.isSelf && <Badge>{t("you")}</Badge>}
          </span>
        ),
        sortValue: (user) => user.name,
        isPrimary: true,
      },
      {
        id: "email",
        header: t("columns.email"),
        cell: (user) => user.email,
        sortValue: (u) => u.email,
      },
      {
        id: "role",
        header: t("columns.role"),
        cell: (user) => tr(user.role),
        sortValue: (u) => u.role,
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: (user) => (
          <Badge tone={user.isActive ? "success" : "neutral"}>
            {user.isActive ? t("active") : t("inactive")}
          </Badge>
        ),
      },
    ],
    [t, tr],
  );

  const setActive = async (user: StaffUser, isActive: boolean) => {
    setActionError(null);
    try {
      await update.run({ id: user.id, patch: { isActive } });
    } catch (error) {
      setActionError(errorMessage(error, t("actionFailed")));
    }
  };

  return {
    ...users,
    columns,
    // Owners (the signed-in one included) are not changed from here: no actions for them.
    rowActions: (user) =>
      user.role === "owner"
        ? []
        : [
            {
              id: "edit",
              label: t("edit"),
              icon: Pencil,
              onSelect: () => setDialog({ kind: "edit", user }),
            },
            {
              id: "password",
              label: t("changePassword"),
              icon: KeyRound,
              onSelect: () => setDialog({ kind: "password", user }),
            },
            user.isActive
              ? {
                  id: "access",
                  label: t("deactivate"),
                  icon: Power,
                  tone: "danger",
                  onSelect: () => setActive(user, false),
                  confirm: {
                    question: t("deactivateQuestion", { name: user.name }),
                    confirmLabel: t("deactivate"),
                  },
                }
              : {
                  id: "access",
                  label: t("activate"),
                  icon: Power,
                  onSelect: () => setActive(user, true),
                },
          ],
    dialog,
    openCreate: () => {
      setNotice(null);
      setDialog({ kind: "create" });
    },
    closeDialog: () => setDialog(null),
    notice,
    setNotice,
    actionError,
  };
}
