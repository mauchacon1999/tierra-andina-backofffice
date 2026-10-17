import { VALIDATION_MESSAGES_ES_VE } from "@ta/validators";

import esVE from "@/i18n/messages/es-VE.json";

/*
 * Everything the UI says. Screen texts live in `messages/<locale>.json`; validation messages
 * come from @ta/validators (shared with the API) under the `validation` namespace.
 */
export const MESSAGES = {
  "es-VE": { ...esVE, validation: VALIDATION_MESSAGES_ES_VE },
};

export type Messages = (typeof MESSAGES)["es-VE"];
