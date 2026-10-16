import { schema, type Database } from "@ta/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export type AuthConfig = {
  db: Database;
  /** BETTER_AUTH_SECRET: signs session cookies. At least 32 characters. */
  secret: string;
  /** Public URL of this API (BETTER_AUTH_URL), e.g. http://localhost:4000. */
  baseUrl: string;
  /** The web origin, trusted for cookie-based requests (CSRF / origin checks). */
  webOrigin: string;
};

function buildAuth({ db, secret, baseUrl, webOrigin }: AuthConfig) {
  return betterAuth({
    secret,
    baseURL: baseUrl,
    basePath: "/api/auth",
    trustedOrigins: [webOrigin],
    // Tables in packages/db/src/schema/auth.ts: plural names, uuid ids like every other table.
    database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
    advanced: {
      database: { generateId: () => Bun.randomUUIDv7() },
      // Explicit on purpose: Better Auth skips the origin (CSRF) check when NODE_ENV=test,
      // which would make our tests pass on behavior production does not have.
      disableOriginCheck: false,
    },
    emailAndPassword: {
      enabled: true,
      // Nobody signs up: the owner is created by the seed and adds the other users.
      disableSignUp: true,
      minPasswordLength: 8,
    },
  });
}

export type Auth = ReturnType<typeof buildAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
export type AuthUser = AuthSession["user"];

/** Better Auth instance (sessions in the database, httpOnly cookie). */
export function createAuth(config: AuthConfig): Auth {
  return buildAuth(config);
}

/** Spanish messages for the Better Auth error codes users can actually hit. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos",
  INVALID_EMAIL: "El correo no es válido",
  INVALID_PASSWORD: "La contraseña no es válida",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta",
  EMAIL_PASSWORD_SIGN_UP_DISABLED: "El registro está deshabilitado",
  SESSION_EXPIRED: "La sesión expiró. Inicia sesión de nuevo",
};

const DEFAULT_AUTH_MESSAGE = "No se pudo completar la autenticación";

/**
 * Better Auth answers errors as `{ code, message }` (English). Rewrite them to the unified
 * `{ error: { code, message } }` shape with Spanish messages; successful responses pass through.
 */
export async function toUnifiedAuthResponse(response: Response): Promise<Response> {
  if (response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    return response;
  }
  const body: unknown = await response.json().catch(() => null);
  const rawCode =
    body && typeof body === "object" && "code" in body && typeof body.code === "string"
      ? body.code
      : `HTTP_${response.status}`;
  const code = rawCode.toUpperCase();

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(
    JSON.stringify({ error: { code, message: AUTH_ERROR_MESSAGES[code] ?? DEFAULT_AUTH_MESSAGE } }),
    { status: response.status, headers },
  );
}
