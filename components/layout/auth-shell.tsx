import Image from "next/image";
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-8rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
      <div className="relative hidden lg:block">
        <Image src="/media/brand/lab-classroom.webp" alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-950/80 via-deep-900/20 to-transparent" />
        <p className="absolute bottom-10 start-10 font-latin text-sm font-bold tracking-[0.3em] text-cyan-300">LEARN · BUILD · INNOVATE</p>
      </div>
    </div>
  );
}
