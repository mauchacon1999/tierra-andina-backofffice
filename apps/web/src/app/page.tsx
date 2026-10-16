import { SessionCard } from "@/features/auth/components/session-card";
import { SessionGate } from "@/features/auth/components/session-gate";
import { StatusPanel } from "@/features/system-status/components/status-panel";

export default function Home(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-800 dark:text-emerald-400">
          Tierra Andina
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Sistema administrativo</p>
      </header>

      <SessionGate>
        <div className="space-y-6">
          <SessionCard />
          <StatusPanel />
        </div>
      </SessionGate>
    </main>
  );
}
