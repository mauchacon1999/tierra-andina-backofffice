import type { OfficialBcvRate } from "@ta/core";
import type { Database } from "@ta/db";
import type { MembershipRole } from "@ta/validators";
import type { RequestIdVariables } from "hono/request-id";

import type { Auth, AuthSession, AuthUser } from "@/lib/auth";

/** The store the request acts on and the caller's role in it (set by `requireRole`). */
export type Membership = {
  storeId: string;
  role: MembershipRole;
};

/** Who performs a write; passed to services for `recordAudit` (no Hono types there). */
export type Actor = {
  userId: string;
  storeId: string;
};

/** Context types shared by the whole Hono app. */
export type AppEnv = {
  Variables: RequestIdVariables & {
    db: Database;
    auth: Auth;
    /** Set on /api/v1/* by the session middleware; null when not signed in. */
    user: AuthUser | null;
    session: AuthSession["session"] | null;
    /** Set by `requireRole`; read it with `getMembership(c)` / `getActor(c)`. */
    membership: Membership | undefined;
    /** Consults the official BCV publication. Tests replace it so they never call the network. */
    officialBcvRate: () => Promise<OfficialBcvRate>;
  };
};
