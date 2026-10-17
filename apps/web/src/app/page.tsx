import { SessionCard } from "@/features/auth/components/session-card";
import { SessionGate } from "@/features/auth/components/session-gate";
import { OwnerShortcuts } from "@/features/home/components/owner-shortcuts";
import { StatusPanel } from "@/features/system-status/components/status-panel";

export default function Home(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">Tierra Andina</h1>
        <p className="mt-1 text-muted">Sistema administrativo</p>
      </header>

      <SessionGate>
        <div className="space-y-6">
          <SessionCard />
          <OwnerShortcuts />
          <StatusPanel />
        </div>
      </SessionGate>
    </main>
  );
}
