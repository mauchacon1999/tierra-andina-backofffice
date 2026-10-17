import { RoleGate } from "@/features/auth/components/role-gate";

/** Owner-only screens (products, purchases, reports…). The API enforces the same roles. */
export default function OwnerLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return <RoleGate roles={["owner"]}>{children}</RoleGate>;
}
