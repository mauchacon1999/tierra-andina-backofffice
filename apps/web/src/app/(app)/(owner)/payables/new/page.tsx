import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NewPayableScreen } from "@/features/payables/components/payable-editor-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("payables.pageTitle") }) };
}

export default function NewPayablePage(): React.JSX.Element {
  return <NewPayableScreen />;
}
