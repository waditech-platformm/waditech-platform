import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label } from "@/components/ui/form";
import { requestLinkAction } from "@/features/parent/actions";

export default async function ParentHome({ params }: PageProps<"/[locale]/parent">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "parent", `/${locale}/parent`);
  const supabase = await createClient();
  const { data: links } = await supabase.from("parent_student_links").select("id, status, student_id, created_at").eq("parent_id", viewer.id).order("created_at");
  const verified = (links ?? []).filter((x) => x.status === "verified");
  // profiles are visible ONLY for verified children (RLS: is_parent_of)
  const { data: kids } = verified.length ? await supabase.from("profiles").select("id, full_name").in("id", verified.map((v) => v.student_id)) : { data: [] };
  const { data: enr } = verified.length ? await supabase.from("enrollments").select("student_id, status").in("student_id", verified.map((v) => v.student_id)) : { data: [] };
  return (
    <PortalShell title={d.parent.title} subtitle={viewer.profile.full_name} nav={[{ href: `/${locale}/parent`, label: d.parent.children, exact: true }, { href: `/${locale}/dashboard/payments`, label: d.dashboard.orders }, { href: `/${locale}/dashboard/notifications`, label: d.dashboard.notifications }, { href: `/${locale}/dashboard/settings`, label: d.dashboard.settings }]}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {(kids ?? []).length === 0 && <EmptyState title={d.parent.noChildren} body={d.parent.linkHelp} />}
          {(kids ?? []).map((k) => {
            const e = (enr ?? []).filter((x) => x.student_id === k.id);
            return (
              <Card key={k.id} className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-full bg-royal-50 text-lg font-bold text-royal-700">{k.full_name.replace(/^Demo (Student )?/, "").slice(0, 1)}</span>
                  <div><p className="font-bold text-navy-900">{k.full_name}</p><p className="text-sm text-muted">{e.filter((x) => ["active", "completed"].includes(x.status)).length} {d.parent.enrollments}</p></div></div>
                <Link href={`/${locale}/parent/children/${k.id}`} className="text-sm font-semibold text-royal-600">{d.parent.viewProgress} →</Link>
              </Card>
            );
          })}
          {(links ?? []).filter((x) => x.status === "pending").map((x) => <Card key={x.id} className="p-4 text-sm"><Badge tone="warning">{d.parent.pending}</Badge></Card>)}
        </div>
        <Card className="h-fit p-6">
          <h2 className="font-bold text-navy-900">{d.parent.linkChild}</h2>
          <p className="mt-1 text-sm text-muted">{d.parent.linkHelp}</p>
          <ActionForm action={requestLinkAction} resetOnSuccess className="mt-4 space-y-3">
            <div><Label htmlFor="code">{d.parent.code}</Label><Input id="code" name="code" dir="ltr" className="font-latin uppercase tracking-widest" maxLength={16} required /><FieldError name="code" /></div>
            <SubmitButton pendingLabel={d.common.loading}>{d.parent.request}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </PortalShell>
  );
}
