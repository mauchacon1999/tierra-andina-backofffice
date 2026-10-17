import { RoleGate } from "@/features/auth/components/role-gate";

/** Truck receipt screens: the receiver, and the owner who can also mark what arrived. */
export default function ReceiverLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return <RoleGate roles={["owner", "receiver"]}>{children}</RoleGate>;
}
