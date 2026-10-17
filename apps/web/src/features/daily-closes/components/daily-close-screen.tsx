"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { CloseForm } from "@/features/daily-closes/components/close-form";
import { CloseSummary } from "@/features/daily-closes/components/close-summary";
import { useDailyCloseScreen } from "@/features/daily-closes/hooks/use-daily-close-screen";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDateLong } from "@/utils/format-date";

/** The manager's "Cierre del día": pick the day; send its close, or see the one already sent. */
export function DailyCloseScreen(): React.JSX.Element {
  const s = useDailyCloseScreen();
  const t = useTranslations("dailyClose");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

  return (
    <div className="space-y-5">
      <TextField
        label={t("date")}
        type="date"
        value={s.date}
        onChange={(event) => event.target.value && s.setDate(event.target.value)}
        hint={formatBusinessDateLong(s.date)}
      />
      {s.error && (
        <Alert tone="error" title={t("loadFailed")}>
          <p>{errorMessage(s.error, s.error.message)}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={s.retry}>
            {tc("retry")}
          </Button>
        </Alert>
      )}
      {s.isLoading && (
        <p role="status" className="text-muted">
          {tc("loading")}
        </p>
      )}
      {s.close && (
        <div className="space-y-3">
          <Alert tone={s.justSent ? "success" : "info"}>
            {s.justSent ? t("sent") : `${t("alreadySent")} ${t("onlyOwnerFixes")}`}
          </Alert>
          <CloseSummary close={s.close} />
        </div>
      )}
      {s.isMissing && (
        <CloseForm key={s.date} mode="submit" businessDate={s.date} onDone={s.onSent} />
      )}
    </div>
  );
}
