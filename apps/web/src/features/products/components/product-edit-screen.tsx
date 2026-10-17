"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { useProduct } from "@/features/products/api/use-product";
import { useToggleProductActive } from "@/features/products/api/use-product-mutations";
import { ProductForm } from "@/features/products/components/product-form";
import { useErrorMessage } from "@/i18n/use-error-message";

/** Edit screen: loads the product, the form, and activate/deactivate. */
export function ProductEditScreen(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { product, error, isLoading, retry } = useProduct(id);
  const toggle = useToggleProductActive();
  const t = useTranslations("products.edit");
  const tl = useTranslations("products.list");
  const tf = useTranslations("products.form");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

  if (error && !product) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title={t("loadFailed")}>
          {errorMessage(error, error.message)}
        </Alert>
        <div className="flex gap-3">
          {error.status !== 404 && (
            <Button variant="secondary" onClick={retry}>
              {tc("retry")}
            </Button>
          )}
          <ButtonLink href="/products" variant="secondary">
            {tf("viewProducts")}
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (isLoading || !product) {
    return (
      <p role="status" className="text-muted">
        {tc("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{product.name}</h2>
        {!product.isActive && <Badge>{tl("inactive")}</Badge>}
      </div>
      <ProductForm mode="edit" product={product} />
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {product.isActive ? t("deactivateHint") : t("activateHint")}
        </p>
        <Button
          variant={product.isActive ? "danger" : "secondary"}
          isLoading={toggle.isRunning}
          loadingText={product.isActive ? t("deactivating") : t("activating")}
          onClick={() => void toggle.run({ id, isActive: !product.isActive })}
        >
          {product.isActive ? t("deactivate") : t("activate")}
        </Button>
      </Card>
    </div>
  );
}
