import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { LOCALE, TIME_ZONE } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";

/** Test wrapper with the real es-VE messages, so tests assert on the texts users read. */
export function IntlTestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <NextIntlClientProvider locale={LOCALE} messages={MESSAGES[LOCALE]} timeZone={TIME_ZONE}>
      {children}
    </NextIntlClientProvider>
  );
}
