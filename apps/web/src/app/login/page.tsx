import type { Metadata } from "next";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Entrar · Tierra Andina",
};

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-800 dark:text-emerald-400">
          Tierra Andina
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Inicia sesión para continuar</p>
      </header>
      <SignInForm />
    </main>
  );
}
