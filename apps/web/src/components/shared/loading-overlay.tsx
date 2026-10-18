"use client";

import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/shared/brand-mark";

/**
 * Full-screen cover while the session (or a role check) is still resolving.
 * The isotype sits in the middle, over a dimmed page, instead of a bare line of text.
 */
export function LoadingOverlay(): React.JSX.Element {
  const t = useTranslations("common");

  return (
    <div
      role="status"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm"
    >
      <BrandMark className="size-20" />
      <p className="text-sm text-muted">{t("loading")}</p>
    </div>
  );
}
