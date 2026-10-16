"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useSignInForm } from "@/features/auth/hooks/use-sign-in-form";

export function SignInForm(): React.JSX.Element {
  const { form, onSubmit, isSubmitting, formError } = useSignInForm();
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Correo"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register("password")}
      />

      <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Entrando…">
        Entrar
      </Button>
    </form>
  );
}
