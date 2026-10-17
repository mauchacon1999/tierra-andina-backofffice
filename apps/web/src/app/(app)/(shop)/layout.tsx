import { RoleGate } from "@/features/auth/components/role-gate";

/** Screens the owner uses today and the manager will use once that user exists. */
export default function ShopLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return <RoleGate roles={["owner", "manager"]}>{children}</RoleGate>;
}
