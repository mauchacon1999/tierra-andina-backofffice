import { RoleGate } from "@/features/auth/components/role-gate";

/** Owner-only screens (products, purchases, reports…). The API enforces the same roles. */
export default function OwnerLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-3xl sm:py-12">
      <RoleGate roles={["owner"]}>{children}</RoleGate>
    </main>
  );
}
