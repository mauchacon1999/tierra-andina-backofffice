"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useShoppingList } from "@/features/shopping-list/api/use-shopping-list";
import { useErrorMessage } from "@/i18n/use-error-message";

export type TripNeededListProps = {
  onPick: (productId: string) => void;
};

/** Open shopping-list items while buying, so nothing requested is left behind. */
export function TripNeededList({ onPick }: TripNeededListProps): React.JSX.Element {
  const list = useShoppingList();
  const t = useTranslations("purchases.needed");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t("title")}</h2>
      {list.error && (
        <Alert tone="error" title={t("loadFailed")}>
          <p>{errorMessage(list.error, list.error.message)}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={list.retry}>
            {tc("retry")}
          </Button>
        </Alert>
      )}
      {list.isLoading && (
        <p role="status" className="text-sm text-muted">
          {tc("loading")}
        </p>
      )}
      {!list.isLoading && list.items.length === 0 && (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}
      {list.items.length > 0 && (
        <ul className="space-y-2">
          {list.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.note && <p className="text-sm text-muted">{item.note}</p>}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onPick(item.productId)}
              >
                {t("buy")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
