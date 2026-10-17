import type { MembershipRole } from "@ta/validators";
import { Coins, House, Package, ShoppingCart, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  /** Key under the `nav` messages. */
  labelKey: "home" | "purchases" | "rates" | "products";
  icon: LucideIcon;
  /** Roles that see it; the API enforces the same rule on every request. */
  roles: readonly MembershipRole[];
};

const EVERYONE = ["owner", "manager", "receiver"] as const;

/** Backoffice menu, in order. Add a screen here to give it a sidebar entry. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "home", icon: House, roles: EVERYONE },
  { href: "/purchases", labelKey: "purchases", icon: ShoppingCart, roles: ["owner"] },
  { href: "/rates", labelKey: "rates", icon: Coins, roles: ["owner"] },
  { href: "/products", labelKey: "products", icon: Package, roles: ["owner"] },
];

/** "/" is active only on the home page; other items also for their sub-pages (/purchases/123). */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
