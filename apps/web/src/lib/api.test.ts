import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { api, ApiError } from "@/lib/api";
import { useSessionStore } from "@/stores/use-session-store";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the call to throw ApiError");
}

describe("api client", () => {
  it("calls NEXT_PUBLIC_API_URL with credentials and returns the validated body", async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ ok: true, version: "1.2.3" }));

    const result = await api.get("/health", {
      schema: z.object({ ok: z.literal(true), version: z.string() }),
    });

    expect(result).toEqual({ ok: true, version: "1.2.3" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe("http://api.test/health");
    expect(init.credentials).toBe("include");
  });

  it("turns the unified API error format into a typed ApiError", async () => {
    mockFetch(async () =>
      jsonResponse(
        { error: { code: "DB_UNAVAILABLE", message: "La base de datos no responde" } },
        503,
        { "X-Request-Id": "req-1" },
      ),
    );

    const error = await catchError(api.get("/health/db"));

    expect(error.status).toBe(503);
    expect(error.code).toBe("DB_UNAVAILABLE");
    expect(error.message).toBe("La base de datos no responde");
    expect(error.requestId).toBe("req-1");
    expect(error.isNetworkError).toBe(false);
  });

  it("reports NETWORK_ERROR with status 0 when the API is unreachable", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    const error = await catchError(api.get("/health"));

    expect(error.status).toBe(0);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.isNetworkError).toBe(true);
  });

  it("reports INVALID_RESPONSE when the body does not match the schema", async () => {
    mockFetch(async () => jsonResponse({ ok: "yes" }));

    const error = await catchError(api.get("/health", { schema: z.object({ ok: z.boolean() }) }));

    expect(error.code).toBe("INVALID_RESPONSE");
    expect(error.status).toBe(200);
  });

  it("reports INVALID_RESPONSE when an error body is not in the unified format", async () => {
    mockFetch(async () => new Response("Bad Gateway", { status: 502 }));

    const error = await catchError(api.get("/health"));

    expect(error.code).toBe("INVALID_RESPONSE");
    expect(error.status).toBe(502);
  });

  it("sends the body as JSON", async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ id: "1" }, 201));

    await api.post("/api/v1/products", { name: "Tomate" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Tomate" }));
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });
});

describe("api client store header", () => {
  it("sends the active store as X-Store-Id", async () => {
    useSessionStore.getState().setActiveStore("store-42");
    const fetchMock = mockFetch(async () => jsonResponse({ ok: true }));

    try {
      await api.get("/api/v1/me");
    } finally {
      useSessionStore.getState().clear();
    }

    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(new Headers(init.headers).get("X-Store-Id")).toBe("store-42");
  });

  it("sends no X-Store-Id when no store is active", async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ ok: true }));

    await api.get("/api/v1/me");

    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(new Headers(init.headers).has("X-Store-Id")).toBe(false);
  });
});
