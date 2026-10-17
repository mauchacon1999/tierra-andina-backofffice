import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UsersScreen } from "@/features/users/components/users-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("users.pageTitle") }) };
}

export default async function UsersPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("users");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </header>
      <UsersScreen />
    </div>
  );
}
