import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

// Typed keys: t("purchases.trip.close") fails to compile if the key does not exist.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
