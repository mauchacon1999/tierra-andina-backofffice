import type { ApiError } from "@/lib/api";

export type CheckState =
  | { status: "loading" }
  | { status: "ok"; detail: string; latencyMs: number }
  | { status: "error"; error: ApiError; latencyMs: number };

const styles = {
  loading: {
    card: "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
    dot: "bg-zinc-400 animate-pulse",
    label: "text-zinc-600 dark:text-zinc-400",
    text: "Comprobando…",
  },
  ok: {
    card: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    dot: "bg-emerald-500",
    label: "text-emerald-700 dark:text-emerald-300",
    text: "Operativo",
  },
  error: {
    card: "border-red-500 bg-red-50 dark:bg-red-950/40",
    dot: "bg-red-500",
    label: "text-red-700 dark:text-red-300",
    text: "Sin respuesta",
  },
} as const;

export function StatusCard({ title, state }: { title: string; state: CheckState }) {
  const s = styles[state.status];

  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border-2 p-4 shadow-sm transition-colors ${s.card}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={`flex items-center gap-2 text-sm font-medium ${s.label}`}>
          <span aria-hidden className={`size-3 rounded-full ${s.dot}`} />
          {s.text}
        </span>
      </div>

      {state.status === "ok" && (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          {state.detail} · {state.latencyMs} ms
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <p>{state.error.message}</p>
          <p className="font-mono text-xs break-all text-zinc-500">
            {state.error.code}
            {state.error.status > 0 && ` · HTTP ${state.error.status}`}
            {state.error.requestId && ` · ${state.error.requestId}`}
          </p>
        </div>
      )}
    </section>
  );
}
