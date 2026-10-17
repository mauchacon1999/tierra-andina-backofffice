"use client";

import { STAFF_ROLES } from "@ta/validators";
import { useTranslations } from "next-intl";

import { SegmentedControl } from "@/components/ui/segmented-control";

export type RoleFieldProps = {
  value: (typeof STAFF_ROLES)[number];
  onChange: (role: (typeof STAFF_ROLES)[number]) => void;
  error?: string | undefined;
};

/** Manager or receiver, with what each one can do. */
export function RoleField({ value, onChange, error }: RoleFieldProps): React.JSX.Element {
  const t = useTranslations("users");
  const tr = useTranslations("auth.roles");

  return (
    <SegmentedControl
      label={t("role")}
      name="role"
      options={STAFF_ROLES.map((role) => ({ value: role, label: tr(role) }))}
      value={value}
      onChange={onChange}
      hint={t(`roleHints.${value}`)}
      error={error}
    />
  );
}
