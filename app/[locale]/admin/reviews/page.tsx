import { Star } from "lucide-react";
import { pick } from "@/lib/i18n/config";
import { Badge, Card } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import { moderateReviewAction } from "@/features/admin/actions";

type Row = { id: string; rating: number; body: string; status: string; featured: boolean; author_role: string; created_at: string; is_test_data: boolean; courses: { title_en: string; title_ar: string } | null };

export default async function AdminReviews({ params }: PageProps<"/[locale]/admin/reviews">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const { data } = await supabase.from("course_reviews").select("id, rating, body, status, featured, author_role, created_at, is_test_data, courses(title_en, title_ar)").order("status", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as Row[];
  const act = (r: Row, status: string, featured: boolean, label: string, variant: "primary" | "secondary" = "secondary") => (
    <ActionForm action={moderateReviewAction} refreshOnSuccess className="inline">
      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={status} /><input type="hidden" name="featured" value={String(featured)} />
      <SubmitButton size="sm" variant={variant}>{label}</SubmitButton>
    </ActionForm>
  );
  return (
    <div className="space-y-6">
      <AdminTitle title={a.reviews} subtitle={d.community.verifiedNote} />
      {rows.length === 0 && <p className="text-sm text-muted">{a.noneYet}</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={toneFor(r.status)}>{r.status}</Badge>
                {r.featured && <Badge tone="cyan">{a.feature}</Badge>}
                <span className="font-semibold text-navy-900">{r.courses ? pick(r.courses, "title", locale) : ""}</span>
                <span className="text-subtle">· {r.author_role === "parent" ? d.community.parent : d.community.student}</span>
                <span className="flex" role="img" aria-label={d.community.stars.replace("{n}", String(r.rating))}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-line"}`} aria-hidden />)}</span>
                {r.is_test_data && <span className="text-xs text-warning">{d.common.demoBadge}</span>}
              </div>
              <p className="mt-3 text-navy-900">{r.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status !== "approved" && act(r, "approved", false, a.approve, "primary")}
                {r.status !== "rejected" && act(r, "rejected", false, a.reject)}
                {r.status === "approved" && (r.featured ? act(r, "approved", false, a.unfeature) : act(r, "approved", true, a.feature))}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
