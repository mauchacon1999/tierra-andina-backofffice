import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { LOCALE } from "@/i18n/config";
import { SwrProvider } from "@/lib/swr-config";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.appName"), description: t("app.description") };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default function RootLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <html lang={LOCALE} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {/* Messages, locale and time zone are inherited from src/i18n/request.ts. */}
        <NextIntlClientProvider>
          <SwrProvider>{children}</SwrProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
