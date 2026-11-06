import type { Dict } from "@/messages/en";
export const trainerNav = (locale: string, d: Dict) => [
  { href: `/${locale}/trainer`, label: d.trainer.myCourses, exact: true },
  { href: `/${locale}/trainer/submissions`, label: d.trainer.submissions },
  { href: `/${locale}/trainer/labs`, label: d.trainer.labSubmissions },
  { href: `/${locale}/trainer/profile`, label: d.trainer.myProfile },
];
