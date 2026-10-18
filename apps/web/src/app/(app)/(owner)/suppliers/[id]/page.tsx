import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SupplierDetailScreen } from "@/features/suppliers/components/supplier-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("suppliers.pageTitle") }) };
}

export default function SupplierPage(): React.JSX.Element {
  return <SupplierDetailScreen />;
}
