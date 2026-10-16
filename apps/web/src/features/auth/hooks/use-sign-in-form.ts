"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignIn, type SignInInput } from "@ta/validators";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";

import { useSignIn } from "@/features/auth/api/use-sign-in";
import { isApiError } from "@/lib/api";

export type UseSignInFormResult = {
  form: UseFormReturn<SignInInput, unknown, SignIn>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  /** Error from the API (wrong password, network…), already in Spanish. */
  formError: string | undefined;
};

const FALLBACK_ERROR = "No se pudo iniciar sesión. Intenta de nuevo";

/** Sign-in form state: validation with `signInSchema`, API errors, redirect home on success. */
export function useSignInForm(): UseSignInFormResult {
  const router = useRouter();
  const { signIn, isSigningIn } = useSignIn();
  const form = useForm<SignInInput, unknown, SignIn>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (credentials) => {
    try {
      await signIn(credentials);
      router.replace("/");
    } catch (error) {
      form.setError("root", { message: isApiError(error) ? error.message : FALLBACK_ERROR });
    }
  });

  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: isSigningIn || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
