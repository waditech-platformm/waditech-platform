import Link from "next/link";
import { Container } from "@/components/ui/primitives";
export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-6xl font-extrabold text-royal-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-navy-900">Page not found · الصفحة غير موجودة</h1>
      <p className="mt-2 text-muted">The page you are looking for does not exist. · الصفحة التي تبحث عنها غير موجودة.</p>
      <div className="mt-6 flex justify-center gap-3"><Link className="font-semibold text-royal-600" href="/en">Home</Link><Link className="font-semibold text-royal-600" href="/ar">الرئيسية</Link></div>
    </Container>
  );
}
