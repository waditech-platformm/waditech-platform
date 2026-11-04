import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { aiProvider, PRICE_PER_MTOK } from "@/server/ai";
import { screen, SYSTEM_PROMPT } from "@/server/ai/guard";
import { assertSameOrigin, json } from "@/server/http/guards";
import { getDict } from "@/lib/i18n/dictionary";

const schema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
  locale: z.enum(["en", "ar"]).default("en"),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(8),
});

export async function POST(req: NextRequest) {
  const bad = assertSameOrigin(req); if (bad) return bad;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const { courseId, lessonId, locale, messages } = parsed.data;
  const d = getDict(locale);
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return json({ error: d.errors.unauthorized }, 401);

  // role-aware access: enrolled students or course staff only (checked by the DB helpers)
  const [{ data: enrolled }, { data: staff }] = await Promise.all([
    supabase.rpc("is_enrolled", { course: courseId }),
    supabase.rpc("is_course_staff", { course: courseId }),
  ]);
  if (!enrolled && !staff) return json({ error: d.errors.forbidden }, 403);

  const admin = createAdminClient();
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).gte("created_at", since).is("blocked_reason", null);
  if ((count ?? 0) >= env().AI_DAILY_LIMIT) return json({ error: d.ai.limit }, 429);

  const last = messages[messages.length - 1];
  if (last.role !== "user") return json({ error: "invalid" }, 400);
  const check = screen(last.content);
  const provider = aiProvider();
  if (!check.ok) {
    await admin.from("ai_usage").insert({ user_id: u.user.id, provider: provider.name, course_id: courseId, blocked_reason: check.reason });
    return json({ answer: d.ai.blocked, provider: provider.name });
  }
  // context = lesson text the user can already read (RLS-scoped query), never other students' data
  let context = "";
  if (lessonId) {
    const { data: lesson } = await supabase.from("lessons").select("title_en, title_ar, body_en, body_ar").eq("id", lessonId).eq("course_id", courseId).maybeSingle();
    if (lesson) context = `${locale === "ar" ? lesson.title_ar : lesson.title_en}\n${(locale === "ar" ? lesson.body_ar : lesson.body_en) ?? ""}`.slice(0, 6000);
  }
  const history = messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  try {
    const out = await provider.complete({ system: SYSTEM_PROMPT, context, messages: [...history, { role: "user", content: check.cleaned }], locale });
    const [pin, pout] = PRICE_PER_MTOK[provider.name] ?? [0, 0];
    await admin.from("ai_usage").insert({ user_id: u.user.id, provider: provider.name, model: out.model, course_id: courseId, input_tokens: out.inputTokens, output_tokens: out.outputTokens, cost_usd: (out.inputTokens * pin + out.outputTokens * pout) / 1e6 });
    return json({ answer: out.text.slice(0, 4000), provider: provider.name });
  } catch (e) {
    console.error("[ai]", e);
    return json({ error: d.errors.generic }, 502);
  }
}
