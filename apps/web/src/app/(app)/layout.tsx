import { SessionGate } from "@/features/auth/components/session-gate";
import { AppShell } from "@/features/navigation/components/app-shell";

/** Every signed-in screen: session check, then the backoffice shell (sidebar + content). */
export default function AppLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
