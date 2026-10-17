"use client";

import { signInSchema, type SignIn, type SignInInput } from "@ta/validators";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, type UseFormReturn } from "react-hook-form";

import { useSignIn } from "@/features/auth/api/use-sign-in";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";

export type UseSignInFormResult = {
  form: UseFormReturn<SignInInput, unknown, SignIn>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  /** Error from the API (wrong password, network…), in the user's language. */
  formError: string | undefined;
};

/** Sign-in form state: validation with `signInSchema`, API errors, redirect home on success. */
export function useSignInForm(): UseSignInFormResult {
  const router = useRouter();
  const { signIn, isSigningIn } = useSignIn();
  const t = useTranslations("auth.signIn");
  const errorMessage = useErrorMessage();
  const form = useForm<SignInInput, unknown, SignIn>({
    resolver: useZodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (credentials) => {
    try {
      await signIn(credentials);
      router.replace("/");
    } catch (error) {
      form.setError("root", { message: errorMessage(error, t("failed")) });
    }
  });

  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: isSigningIn || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
