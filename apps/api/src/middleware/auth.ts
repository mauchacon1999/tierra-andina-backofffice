import type { MembershipRole } from "@ta/validators";
import type { Context, MiddlewareHandler } from "hono";

import { AppError, ErrorCode } from "@/lib/errors";
import { findActiveMemberships } from "@/lib/memberships";
import type { Actor, AppEnv, Membership } from "@/lib/types";

/** Reads the session cookie (if any) and exposes `user` / `session` on the context. */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const result = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  c.set("user", result?.user ?? null);
  c.set("session", result?.session ?? null);
  await next();
};

function unauthenticated(): AppError {
  return new AppError(ErrorCode.UNAUTHENTICATED, "Inicia sesión para continuar", 401);
}

/** 401 unless the request carries a valid session. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("user")) throw unauthenticated();
  await next();
};

/**
 * Allows the request only if the user has one of `roles` in the target store.
 * The store is the `X-Store-Id` header or, when absent, the user's only active membership.
 * Sets `membership` (and so `getActor(c)`) for the handler and the audit log.
 */
export function requireRole(...roles: MembershipRole[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) throw unauthenticated();

    const active = await findActiveMemberships(c.get("db"), user.id);
    const requestedStore = c.req.header("x-store-id");

    if (!requestedStore && active.length > 1) {
      throw new AppError(
        ErrorCode.STORE_REQUIRED,
        "Indica la tienda en la que quieres trabajar",
        400,
      );
    }
    const membership = requestedStore
      ? active.find((m) => m.storeId === requestedStore)
      : active[0];

    if (!membership) {
      throw new AppError(ErrorCode.FORBIDDEN, "No tienes acceso a esta tienda", 403);
    }
    if (!roles.includes(membership.role)) {
      throw new AppError(ErrorCode.FORBIDDEN, "No tienes permiso para esta acción", 403);
    }

    c.set("membership", { storeId: membership.storeId, role: membership.role });
    await next();
  };
}

/** The membership resolved by `requireRole`. Throws if the route forgot to use it. */
export function getMembership(c: Context<AppEnv>): Membership {
  const membership = c.get("membership");
  if (!membership) throw new Error("getMembership() used on a route without requireRole()");
  return membership;
}

/** Who performs the current request's writes (for `recordAudit` in services). */
export function getActor(c: Context<AppEnv>): Actor {
  const user = c.get("user");
  if (!user) throw unauthenticated();
  return { userId: user.id, storeId: getMembership(c).storeId };
}
