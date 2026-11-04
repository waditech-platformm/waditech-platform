import { FieldError } from "@/components/ui/action-form";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";

type Base = { name: string; label: string; className?: string; required?: boolean; dir?: "ltr" | "rtl" | "auto" };
export function TextField({ name, label, className, required, dir, defaultValue, type = "text", placeholder, ...rest }: Base & { defaultValue?: string | number | null; type?: string; placeholder?: string; min?: number; max?: number; step?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}{required && <span className="text-danger"> *</span>}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} dir={dir} placeholder={placeholder} {...rest} />
      <FieldError name={name} />
    </div>
  );
}
export function AreaField({ name, label, className, required, dir, defaultValue, rows = 5 }: Base & { defaultValue?: string | null; rows?: number }) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}{required && <span className="text-danger"> *</span>}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue ?? ""} required={required} dir={dir} rows={rows} />
      <FieldError name={name} />
    </div>
  );
}
export function SelectField({ name, label, className, options, defaultValue, required }: Base & { options: [string, string][]; defaultValue?: string | null }) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} name={name} defaultValue={defaultValue ?? ""} required={required}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
      <FieldError name={name} />
    </div>
  );
}
export function CheckField({ name, label, defaultChecked, className }: { name: string; label: string; defaultChecked?: boolean; className?: string }) {
  return <label className={cn("flex items-center gap-2 text-sm font-medium", className)}><input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-royal-600" />{label}</label>;
}
/** ISO timestamp -> value for <input type="datetime-local"> in Amman time */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const dt = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(dt);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
}
