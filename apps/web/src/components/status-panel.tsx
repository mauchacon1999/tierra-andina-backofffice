"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { getDbHealth, getHealth } from "@/lib/health";

import { type CheckState, StatusCard } from "./status-card";

const POLL_MS = 5000;

async function runCheck<T>(fn: () => Promise<T>, describe: (r: T) => string): Promise<CheckState> {
  const start = performance.now();
  try {
    const result = await fn();
    return {
      status: "ok",
      detail: describe(result),
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({ status: 0, code: "UNKNOWN", message: String(error) });
    return { status: "error", error: apiError, latencyMs: Math.round(performance.now() - start) };
  }
}

/** Consulta /health y /health/db cada 5 s. Nunca lanza: los fallos se pintan en rojo. */
export function StatusPanel() {
  const [api, setApi] = useState<CheckState>({ status: "loading" });
  const [db, setDb] = useState<CheckState>({ status: "loading" });
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const check = useCallback(async () => {
    const [apiState, dbState] = await Promise.all([
      runCheck(getHealth, (r) => `Versión ${r.version}`),
      runCheck(getDbHealth, () => "PostgreSQL responde"),
    ]);
    setApi(apiState);
    setDb(dbState);
    setCheckedAt(new Date().toLocaleTimeString("es-VE"));
  }, []);

  useEffect(() => {
    // La primera comprobación se agenda (no síncrona) para no encadenar renders en el efecto.
    const first = setTimeout(() => void check(), 0);
    const interval = setInterval(() => void check(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [check]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard title="API" state={api} />
        <StatusCard title="Base de datos" state={db} />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{checkedAt ? `Última comprobación: ${checkedAt}` : "Comprobando…"}</span>
        <button
          type="button"
          onClick={() => void check()}
          className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none active:bg-emerald-900"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
