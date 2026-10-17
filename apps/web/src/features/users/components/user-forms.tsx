"use client";

import type { StaffUser } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { RoleField } from "@/features/users/components/role-field";
import {
  useCreateUserForm,
  useEditUserForm,
  usePasswordForm,
} from "@/features/users/hooks/use-user-forms";

const submitOn = (onSubmit: () => Promise<void>) => (event: React.FormEvent) => {
  event.preventDefault();
  void onSubmit();
};

export type CreateUserFormProps = { onDone: (user: StaffUser) => void };

/** "Nuevo usuario". */
export function CreateUserForm({ onDone }: CreateUserFormProps): React.JSX.Element {
  const t = useTranslations("users");
  const f = useCreateUserForm(onDone);
  const { errors } = f.form.formState;

  return (
    <form noValidate className="space-y-4" onSubmit={submitOn(f.onSubmit)}>
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <TextField
        label={t("name")}
        required
        autoComplete="off"
        error={errors.name?.message}
        {...f.form.register("name")}
      />
      <TextField
        label={t("email")}
        required
        type="email"
        inputMode="email"
        autoComplete="off"
        hint={t("emailHint")}
        error={errors.email?.message}
        {...f.form.register("email")}
      />
      <TextField
        label={t("password")}
        required
        type="text"
        autoComplete="new-password"
        hint={t("passwordHint")}
        error={errors.password?.message}
        {...f.form.register("password")}
      />
      <RoleField
        value={f.form.watch("role") === "receiver" ? "receiver" : "manager"}
        onChange={(role) => f.form.setValue("role", role, { shouldDirty: true })}
        error={errors.role?.message}
      />
      <Button
        type="submit"
        className="w-full"
        isLoading={f.isSubmitting}
        loadingText={t("creating")}
      >
        {t("create")}
      </Button>
    </form>
  );
}

export type EditUserFormProps = { user: StaffUser; onDone: () => void };

/** Name and role. */
export function EditUserForm({ user, onDone }: EditUserFormProps): React.JSX.Element {
  const t = useTranslations("users");
  const f = useEditUserForm(user, onDone);
  const { errors } = f.form.formState;

  return (
    <form noValidate className="space-y-4" onSubmit={submitOn(f.onSubmit)}>
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <TextField
        label={t("name")}
        required
        autoComplete="off"
        error={errors.name?.message}
        {...f.form.register("name")}
      />
      <RoleField
        value={f.form.watch("role") === "receiver" ? "receiver" : "manager"}
        onChange={(role) => f.form.setValue("role", role, { shouldDirty: true })}
        error={errors.role?.message}
      />
      <Button type="submit" className="w-full" isLoading={f.isSubmitting} loadingText={t("saving")}>
        {t("save")}
      </Button>
    </form>
  );
}

export type PasswordFormProps = { user: StaffUser; onDone: () => void };

/** A new password chosen by the owner. */
export function PasswordForm({ user, onDone }: PasswordFormProps): React.JSX.Element {
  const t = useTranslations("users");
  const f = usePasswordForm(user, onDone);

  return (
    <form noValidate className="space-y-4" onSubmit={submitOn(f.onSubmit)}>
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <TextField
        label={t("newPassword")}
        required
        type="text"
        autoComplete="new-password"
        hint={t("newPasswordHint")}
        error={f.form.formState.errors.password?.message}
        {...f.form.register("password")}
      />
      <Button type="submit" className="w-full" isLoading={f.isSubmitting} loadingText={t("saving")}>
        {t("setPassword")}
      </Button>
    </form>
  );
}
