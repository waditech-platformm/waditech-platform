import type { Dict } from "@/messages/en";
import type { Role } from "@/lib/auth/roles";
export function dashboardNav(locale: string, d: Dict, roles: Role[]) {
  const p = (s: string) => `/${locale}/dashboard${s}`;
  const isStudent = roles.includes("student");
  return [
    ...(isStudent ? [{ href: p(""), label: d.dashboard.studentTitle, exact: true }] : []),
    ...(isStudent ? [{ href: p("/certificates"), label: d.dashboard.certificates }, { href: p("/projects"), label: d.dashboard.portfolio }] : []),
    { href: p("/payments"), label: d.dashboard.orders },
    { href: p("/notifications"), label: d.dashboard.notifications },
    { href: p("/settings"), label: d.dashboard.settings },
  ];
}
