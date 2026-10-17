import type { MembershipRole } from "@ta/validators";
import {
  Calculator,
  ClipboardCheck,
  ClipboardList,
  Coins,
  House,
  Package,
  ShoppingCart,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  /** Key under the `nav` messages. */
  labelKey:
    | "home"
    | "dailyClose"
    | "closes"
    | "shoppingList"
    | "purchases"
    | "receipt"
    | "prices"
    | "rates"
    | "products";
  icon: LucideIcon;
  /** Roles that see it; the API enforces the same rule on every request. */
  roles: readonly MembershipRole[];
  /** Live counter shown next to the entry ("3 por recibir"…). */
  counter?: "pendingCloses";
};

const EVERYONE = ["owner", "manager", "receiver"] as const;

/** Backoffice menu, in order. Add a screen here to give it a sidebar entry. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "home", icon: House, roles: EVERYONE },
  { href: "/close", labelKey: "dailyClose", icon: Calculator, roles: ["owner", "manager"] },
  {
    href: "/closes",
    labelKey: "closes",
    icon: ClipboardCheck,
    roles: ["owner"],
    counter: "pendingCloses",
  },
  {
    href: "/shopping-list",
    labelKey: "shoppingList",
    icon: ClipboardList,
    roles: ["owner", "manager"],
  },
  { href: "/purchases", labelKey: "purchases", icon: ShoppingCart, roles: ["owner"] },
  { href: "/receipt", labelKey: "receipt", icon: Truck, roles: ["owner", "receiver"] },
  { href: "/prices", labelKey: "prices", icon: Tag, roles: ["owner", "manager"] },
  { href: "/rates", labelKey: "rates", icon: Coins, roles: ["owner"] },
  { href: "/products", labelKey: "products", icon: Package, roles: ["owner"] },
];

/** "/" is active only on the home page; other items also for their sub-pages (/purchases/123). */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
