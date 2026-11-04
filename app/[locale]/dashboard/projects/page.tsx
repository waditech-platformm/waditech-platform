import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { deleteProjectAction, saveProjectAction } from "@/features/portfolio/actions";
import { dashboardNav } from "../nav";
export default async function MyProjects({ params }: PageProps<"/[locale]/dashboard/projects">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "dashboard");
  const { data } = await (await createClient()).from("student_projects").select("id, title, description, link_url, visibility, approval_status, created_at").eq("student_id", viewer.id).order("created_at", { ascending: false });
  const tone = { not_requested: "neutral", pending: "warning", approved: "success", rejected: "danger" } as const;
  return (
    <PortalShell title={d.dashboard.portfolio} nav={dashboardNav(locale, d, viewer.roles)}>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">{(data ?? []).map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-navy-900">{p.title}</p><Badge tone={tone[p.approval_status as keyof typeof tone]}>{d.dashboard.approval[p.approval_status as keyof typeof d.dashboard.approval]}</Badge></div>
            {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
            {p.link_url && <a href={p.link_url} className="mt-1 block break-all text-sm text-royal-600" dir="ltr" target="_blank" rel="noopener noreferrer">{p.link_url}</a>}
            <ActionForm action={deleteProjectAction} confirmText={d.common.delete + "?"} className="mt-2"><input type="hidden" name="id" value={p.id} /><button type="submit" className="text-xs font-semibold text-danger">{d.common.delete}</button></ActionForm>
          </Card>
        ))}</div>
        <Card className="h-fit p-6">
          <h2 className="mb-4 font-bold text-navy-900">{d.dashboard.newProject}</h2>
          <ActionForm action={saveProjectAction} resetOnSuccess className="space-y-4">
            <div><Label htmlFor="title">{d.dashboard.projectTitle}</Label><Input id="title" name="title" required /><FieldError name="title" /></div>
            <div><Label htmlFor="description">{d.dashboard.projectDescription}</Label><Textarea id="description" name="description" /></div>
            <div><Label htmlFor="link_url">{d.dashboard.projectLink}</Label><Input id="link_url" name="link_url" type="url" dir="ltr" /><FieldError name="link_url" /></div>
            <div><Label htmlFor="cover_url">{d.dashboard.projectCover}</Label><Input id="cover_url" name="cover_url" dir="ltr" /><FieldError name="cover_url" /></div>
            <div><Label htmlFor="visibility">{d.dashboard.visibility}</Label><Select id="visibility" name="visibility"><option value="private">{d.dashboard.visibilityPrivate}</option><option value="academy">{d.dashboard.visibilityAcademy}</option><option value="public">{d.dashboard.visibilityPublic}</option></Select></div>
            <SubmitButton pendingLabel={d.common.saving}>{d.common.save}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </PortalShell>
  );
}
