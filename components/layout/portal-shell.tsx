import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { PortalNav } from "./portal-nav";

export function PortalShell({ title, subtitle, nav, children, actions }: {
  title: string; subtitle?: string; nav: { href: string; label: string; exact?: boolean }[]; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-[70vh]">
      <div className="border-b border-line bg-paper">
        <Container className="pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-muted">{subtitle}</p>}</div>
            {actions}
          </div>
          <PortalNav items={nav} />
        </Container>
      </div>
      <Container className="py-8">{children}</Container>
    </div>
  );
}
export const PortalLink = Link;
