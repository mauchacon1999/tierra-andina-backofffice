import type { ApiError } from "@/lib/api";

/** UI state of one health check. */
export type CheckState =
  | { status: "loading" }
  | { status: "ok"; detail: string; latencyMs: number }
  | { status: "error"; error: ApiError; latencyMs: number };
