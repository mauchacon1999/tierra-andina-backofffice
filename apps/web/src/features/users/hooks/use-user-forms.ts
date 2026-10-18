"use client";

import {
  createStaffUserSchema,
  setUserPasswordSchema,
  staffUserEditFormSchema,
  type CreateStaffUser,
  type CreateStaffUserInput,
  type SetUserPassword,
  type StaffUser,
  type StaffUserEdit,
  type StaffUserEditFormValues,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

import { useCreateUser, useSetUserPassword, useUpdateUser } from "@/features/users/api/use-users";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { isApiError } from "@/lib/api";

export type UserFormResult<Values extends FieldValues, Output> = {
  form: UseFormReturn<Values, unknown, Output>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

/** API field errors (EMAIL_TAKEN on `email`…) on their field, anything else at the top. */
function useShowError<Values extends FieldValues>(
  form: UseFormReturn<Values, unknown, unknown>,
  fallback: string,
): (error: unknown) => void {
  const errorMessage = useErrorMessage();
  return (error) => {
    const fieldErrors = isApiError(error)
      ? (error.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors
      : undefined;
    const [field, messages] = Object.entries(fieldErrors ?? {})[0] ?? [];
    if (field && messages?.[0] && field in form.getValues()) {
      form.setError(field as Path<Values>, { message: messages[0] }, { shouldFocus: true });
      return;
    }
    form.setError("root", { message: errorMessage(error, fallback) });
  };
}

const EMPTY_USER: CreateStaffUserInput = { name: "", email: "", password: "", role: "manager" };

/** "Nuevo usuario": name, email, the password the owner gives, and the role. */
export function useCreateUserForm(
  onDone: (user: StaffUser) => void,
): UserFormResult<CreateStaffUserInput, CreateStaffUser> {
  const t = useTranslations("users");
  const create = useCreateUser();
  const form = useForm<CreateStaffUserInput, unknown, CreateStaffUser>({
    resolver: useZodResolver(createStaffUserSchema),
    defaultValues: EMPTY_USER,
  });
  const showError = useShowError(form, t("createFailed"));
  const onSubmit = form.handleSubmit(async (input) => {
    try {
      onDone(await create.run(input));
      form.reset(EMPTY_USER);
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: create.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}

/** Name and role of a manager/receiver. */
export function useEditUserForm(
  user: StaffUser,
  onDone: () => void,
): UserFormResult<StaffUserEditFormValues, StaffUserEdit> {
  const t = useTranslations("users");
  const update = useUpdateUser();
  const form = useForm<StaffUserEditFormValues, unknown, StaffUserEdit>({
    resolver: useZodResolver(staffUserEditFormSchema),
    defaultValues: { name: user.name, role: user.role === "receiver" ? "receiver" : "manager" },
  });
  const showError = useShowError(form, t("saveFailed"));
  const onSubmit = form.handleSubmit(async (patch) => {
    try {
      await update.run({ id: user.id, patch });
      onDone();
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: update.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}

/** A new password set by the owner (the user is signed out everywhere). */
export function usePasswordForm(
  user: StaffUser,
  onDone: () => void,
): UserFormResult<SetUserPassword, SetUserPassword> {
  const t = useTranslations("users");
  const setPassword = useSetUserPassword();
  const form = useForm<SetUserPassword, unknown, SetUserPassword>({
    resolver: useZodResolver(setUserPasswordSchema),
    defaultValues: { password: "" },
  });
  const showError = useShowError(form, t("passwordFailed"));
  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await setPassword.run({ id: user.id, password });
      onDone();
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: setPassword.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
