"use client";
import { createContext, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Alert } from "./primitives";
import { buttonClass, type ButtonVariant } from "./button";
import { useI18n } from "@/components/i18n-provider";
import { Loader2 } from "lucide-react";

type Result = { ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string>; data?: Record<string, unknown> } | null;
type Action = (prev: Result, fd: FormData) => Promise<Result>;
const StateCtx = createContext<Result>(null);

export function ActionForm({
  action, children, className, resetOnSuccess, refreshOnSuccess = true, redirectTo, confirmText, id,
}: {
  action: Action; children: React.ReactNode; className?: string; resetOnSuccess?: boolean;
  refreshOnSuccess?: boolean; redirectTo?: string; confirmText?: string; id?: string;
}) {
  const { locale } = useI18n();
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) ref.current?.reset();
    const to = (state.data?.redirect as string | undefined) ?? redirectTo;
    if (to) router.push(to);
    else if (refreshOnSuccess) router.refresh();
  }, [state, resetOnSuccess, refreshOnSuccess, redirectTo, router]);
  return (
    <form
      id={id}
      ref={ref}
      action={formAction}
      className={className}
      noValidate
      onSubmit={(e) => { if (confirmText && !window.confirm(confirmText)) e.preventDefault(); }}
    >
      <input type="hidden" name="locale" value={locale} />
      <StateCtx.Provider value={state}>
        {children}
        {state?.error && <Alert tone="danger" className="mt-4">{state.error}</Alert>}
        {state?.ok && state.message && <Alert tone="success" className="mt-4">{state.message}</Alert>}
      </StateCtx.Provider>
    </form>
  );
}

export function useFieldError(name: string) {
  return useContext(StateCtx)?.fieldErrors?.[name];
}
export function FieldError({ name }: { name: string }) {
  const e = useFieldError(name);
  return e ? <p id={`${name}-error`} className="mt-1 text-xs font-medium text-danger">{e}</p> : null;
}

export function SubmitButton({ children, pendingLabel, variant = "primary", size = "md", className, name, value }: {
  children: React.ReactNode; pendingLabel?: string; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; className?: string; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={buttonClass(variant, size, className)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
