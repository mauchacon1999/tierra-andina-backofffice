"use client";

import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import type { CheckState } from "@/features/system-status/types";
import { useErrorMessage } from "@/i18n/use-error-message";
import { cn } from "@/utils/cn";

// Status colors follow docs/design-system.md §2 (success = primary green, error = danger).
const STYLES = {
  loading: {
    tone: "muted",
    dot: "bg-muted animate-pulse",
    label: "text-muted",
    text: "checking",
  },
  ok: {
    tone: "success",
    dot: "bg-success-border",
    label: "text-primary-text",
    text: "ok",
  },
  error: {
    tone: "danger",
    dot: "bg-danger-border",
    label: "text-danger-text",
    text: "down",
  },
} as const;

export type StatusCardProps = {
  title: string;
  state: CheckState;
};

export function StatusCard({ title, state }: StatusCardProps): React.JSX.Element {
  const style = STYLES[state.status];
  const t = useTranslations("systemStatus");
  const errorMessage = useErrorMessage();

  return (
    <Card aria-live="polite" aria-label={title} tone={style.tone}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={cn("flex items-center gap-2 text-sm font-medium", style.label)}>
          <span aria-hidden className={cn("size-3 rounded-full", style.dot)} />
          {t(style.text)}
        </span>
      </div>

      {state.status === "ok" && (
        <p className="mt-2 text-sm text-muted">
          {t("latency", { detail: state.detail, ms: state.latencyMs })}
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-2 space-y-1 text-sm">
          <p>{errorMessage(state.error, state.error.message)}</p>
          <p className="font-mono text-xs break-all text-muted">
            {state.error.code}
            {state.error.status > 0 && ` · HTTP ${state.error.status}`}
            {state.error.requestId && ` · ${state.error.requestId}`}
          </p>
        </div>
      )}
    </Card>
  );
}
