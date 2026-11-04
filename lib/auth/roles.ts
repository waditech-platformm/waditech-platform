export const ROLES = ["super_admin", "admin", "trainer", "student", "parent", "school_coordinator"] as const;
export type Role = (typeof ROLES)[number];

/** Authorization matrix for portal areas (UI gate; the database enforces data access with RLS). */
export const AREA_ROLES = {
  dashboard: ["student", "parent", "trainer", "school_coordinator", "admin", "super_admin"],
  learn: ["student", "trainer", "admin", "super_admin"],
  trainer: ["trainer", "admin", "super_admin"],
  parent: ["parent"],
  school: ["school_coordinator", "admin", "super_admin"],
  admin: ["admin", "super_admin"],
} as const satisfies Record<string, readonly Role[]>;
export type Area = keyof typeof AREA_ROLES;

export function canAccess(roles: readonly Role[], area: Area) {
  return roles.some((r) => (AREA_ROLES[area] as readonly Role[]).includes(r));
}
export const isAdminRole = (roles: readonly Role[]) => roles.includes("admin") || roles.includes("super_admin");

/** Where a user lands after signing in */
export function homePath(roles: readonly Role[]) {
  if (isAdminRole(roles)) return "/admin";
  if (roles.includes("trainer")) return "/trainer";
  if (roles.includes("school_coordinator")) return "/school";
  if (roles.includes("parent")) return "/parent";
  return "/dashboard";
}

/** Only these next-paths are accepted after login (prevents open redirects) */
export function safeNext(next: string | null | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
