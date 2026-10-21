"use client";

import type { ManualPriceRow } from "@ta/validators";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/utils/cn";

export type WhatsappToggleProps = {
  row: ManualPriceRow;
  onToggle: (row: ManualPriceRow, value: boolean) => void;
};

/** On/off: whether the product goes in the list copied for the WhatsApp group. */
export function WhatsappToggle({ row, onToggle }: WhatsappToggleProps): React.JSX.Element {
  const t = useTranslations("manualPrices");
  const isOn = row.shareOnWhatsapp;

  return (
    <IconButton
      label={t("whatsappToggle", { product: row.productName })}
      aria-pressed={isOn}
      title={t(isOn ? "whatsappOn" : "whatsappOff")}
      className={cn(
        "border",
        isOn
          ? "border-success-border bg-primary-soft text-primary-text"
          : "border-border text-muted",
      )}
      onClick={() => onToggle(row, !isOn)}
    >
      <MessageCircle aria-hidden className="size-5" fill={isOn ? "currentColor" : "none"} />
    </IconButton>
  );
}
