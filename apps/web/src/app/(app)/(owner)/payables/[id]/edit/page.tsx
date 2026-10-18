import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EditPayableScreen } from "@/features/payables/components/payable-editor-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("payables.pageTitle") }) };
}

export default function EditPayablePage(): React.JSX.Element {
  return <EditPayableScreen />;
}
