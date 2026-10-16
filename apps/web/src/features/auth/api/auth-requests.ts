import { meResponseSchema, type MeResponse, type SignIn } from "@ta/validators";

import { api } from "@/lib/api";

/** POST /api/auth/sign-in/email — sets the httpOnly session cookie on success. */
export async function signInWithEmail(credentials: SignIn): Promise<void> {
  await api.post("/api/auth/sign-in/email", credentials);
}

/** POST /api/auth/sign-out — clears the session cookie. */
export async function signOut(): Promise<void> {
  await api.post("/api/auth/sign-out");
}

/** GET /api/v1/me — throws ApiError 401 when signed out. */
export function getMe(): Promise<MeResponse> {
  return api.get("/api/v1/me", { schema: meResponseSchema });
}
