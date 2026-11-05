import "server-only";
import { listCourses, type Course } from "@/features/catalog/queries";
import { listMedia } from "@/features/content/queries";

/** Shared real data for the design-direction previews (published courses + consented public media only). */
export async function previewData() {
  const [courses, photos, videos] = await Promise.all([listCourses(), listMedia({ kind: "image", limit: 40 }), listMedia({ kind: "video", limit: 8 })]);
  return { courses, photos, videos };
}

export const AGE_BANDS = [
  { key: "6-9", min: 6, max: 9 },
  { key: "10-13", min: 10, max: 13 },
  { key: "14-18", min: 14, max: 18 },
] as const;

export const overlaps = (c: Course, min: number, max: number) => (c.age_min ?? 0) <= max && (c.age_max ?? 99) >= min;
