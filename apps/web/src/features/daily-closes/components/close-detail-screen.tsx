"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CloseForm } from "@/features/daily-closes/components/close-form";
import { CloseSummary } from "@/features/daily-closes/components/close-summary";
import { useCloseDetail } from "@/features/daily-closes/hooks/use-close-detail";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDateLong } from "@/utils/format-date";

/** One day's close for the owner: review, correct, approve. */
export function CloseDetailScreen(): React.JSX.Element {
  const { date } = useParams<{ date: string }>();
  const s = useCloseDetail(date);
  const t = useTranslations("closes");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const day = formatBusinessDateLong(date);

  if (s.isMissing) {
    return (
      <div className="space-y-4">
        <Alert tone="info">{t("notFound")}</Alert>
        <ButtonLink href="/closes" variant="secondary">
          {t("back")}
        </ButtonLink>
      </div>
    );
  }
  if (s.error) {
    return (
      <Alert tone="error" title={t("loadFailed")}>
        <p>{errorMessage(s.error, s.error.message)}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={s.retry}>
          {tc("retry")}
        </Button>
      </Alert>
    );
  }
  if (!s.close) {
    return (
      <p role="status" className="text-muted">
        {tc("loading")}
      </p>
    );
  }
  const { close } = s;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold capitalize">{t("detailTitle", { date: day })}</h2>
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      {s.isFixed && <Alert tone="success">{t("fixed")}</Alert>}
      {s.isFixing ? (
        <div className="space-y-3">
          <CloseForm mode="edit" close={close} onDone={s.onFixed} />
          <Button variant="secondary" onClick={s.stopFix}>
            {t("cancelFix")}
          </Button>
        </div>
      ) : (
        <>
          <CloseSummary close={close} />
          <div className="flex flex-col gap-2 sm:flex-row">
            {close.status === "submitted" && (
              <ConfirmButton
                question={t("approveQuestion", { date: day })}
                confirmLabel={t("approve")}
                variant="primary"
                onConfirm={s.approve}
                isLoading={s.isApproving}
                loadingText={t("approving")}
              >
                {t("approve")}
              </ConfirmButton>
            )}
            <Button variant="secondary" onClick={s.startFix}>
              {t("fix")}
            </Button>
            <ConfirmButton
              question={t("deleteQuestion", { date: day })}
              confirmLabel={t("delete")}
              variant="danger"
              onConfirm={s.remove}
              isLoading={s.isDeleting}
              loadingText={t("deleting")}
            >
              {t("delete")}
            </ConfirmButton>
          </div>
        </>
      )}
    </div>
  );
}
