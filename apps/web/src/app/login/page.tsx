import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("auth.signIn.pageTitle") }) };
}

export default async function LoginPage(): Promise<React.JSX.Element> {
  const t = await getTranslations();
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">
          {t("common.appName")}
        </h1>
        <p className="mt-1 text-muted">{t("auth.signIn.subtitle")}</p>
      </header>
      <SignInForm />
    </main>
  );
}
