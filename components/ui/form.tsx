import { cn } from "@/lib/cn";

const base =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-subtle shadow-sm transition focus:border-royal-500 focus:outline-none focus:ring-4 focus:ring-royal-100 disabled:bg-surface aria-[invalid=true]:border-danger";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-navy-900", className)} {...p} />;
}
export const Input = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => <input className={cn(base, "h-11", className)} {...p} />;
export const Textarea = ({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(base, "min-h-28", className)} {...p} />;
export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(base, "h-11 pe-8", className)} {...p} />;

export function Field({ label, name, error, hint, children, className }: {
  label: string; name: string; error?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !error && <p id={`${name}-hint`} className="mt-1 text-xs text-subtle">{hint}</p>}
      {error && <p id={`${name}-error`} className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
export function Checkbox({ label, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex items-start gap-2.5 text-sm text-ink", className)}>
      <input type="checkbox" className="mt-0.5 size-4 rounded border-line accent-royal-600" {...p} />
      <span>{label}</span>
    </label>
  );
}
