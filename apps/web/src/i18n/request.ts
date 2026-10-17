import { getRequestConfig } from "next-intl/server";

import { LOCALE, TIME_ZONE } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";

/*
 * next-intl request config (wired in next.config.ts). One locale and no locale in the URL, so
 * `requestLocale` is never read: reading it would touch headers() and make every page dynamic.
 */
export default getRequestConfig(async () => ({
  locale: LOCALE,
  messages: MESSAGES[LOCALE],
  timeZone: TIME_ZONE,
}));
