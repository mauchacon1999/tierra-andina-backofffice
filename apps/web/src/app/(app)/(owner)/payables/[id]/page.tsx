import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PayableDetailScreen } from "@/features/payables/components/payable-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("payables.pageTitle") }) };
}

export default function PayablePage(): React.JSX.Element {
  return <PayableDetailScreen />;
}
