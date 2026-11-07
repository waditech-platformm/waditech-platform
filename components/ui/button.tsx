import Link from "next/link";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-action text-white hover:bg-action-hover shadow-sm",
  accent: "bg-cyan-500 text-navy-950 hover:bg-cyan-300",
  secondary: "bg-paper text-navy-900 ring-1 ring-line hover:ring-royal-500 hover:text-royal-700",
  ghost: "text-navy-900 hover:bg-royal-50",
  onDark: "bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20",
  danger: "bg-danger text-white hover:opacity-90",
} as const;
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-base" } as const;
export type ButtonVariant = keyof typeof variants;

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof sizes = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    variants[variant],
    sizes[size],
    extra,
  );
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof sizes };
export function Button({ variant = "primary", size = "md", className, type = "button", ...rest }: Props) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}
export function ButtonLink({
  href, variant = "primary", size = "md", className, children, ...rest
}: { href: string; variant?: ButtonVariant; size?: keyof typeof sizes; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return <Link href={href} className={buttonClass(variant, size, className)} {...rest}>{children}</Link>;
}
