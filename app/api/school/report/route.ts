import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** CSV export of the coordinator's OWN school (authorization enforced by school_overview()). */
export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get("org") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(org)) return new Response("bad request", { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("school_overview", { p_org: org });
  if (error) return new Response("forbidden", { status: 403 });
  const rows = (data as { students: { full_name: string; enrollments: number; avg_progress: number | null; attendance_rate: number | null; certificates: number }[] }).students;
  const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s; };
  const csv = ["student,enrollments,avg_progress_percent,attendance_rate_percent,certificates", ...rows.map((r) => [r.full_name, r.enrollments, r.avg_progress ?? "", r.attendance_rate ?? "", r.certificates].map(esc).join(","))].join("\n");
  return new Response("﻿" + csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="school-report.csv"`, "cache-control": "no-store" } });
}
