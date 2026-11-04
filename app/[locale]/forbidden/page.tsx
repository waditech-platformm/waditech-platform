import { isLocale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
export default async function Forbidden({ params }: PageProps<"/[locale]/forbidden">) {
  const { locale: l } = await params; const locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  return (
    <Container className="py-24 text-center">
      <ShieldAlert className="mx-auto size-12 text-danger" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-navy-900">403</h1>
      <p className="mt-2 text-muted">{d.errors.forbidden}</p>
      <ButtonLink className="mt-6" href={`/${locale}`}>{d.common.goHome}</ButtonLink>
    </Container>
  );
}
