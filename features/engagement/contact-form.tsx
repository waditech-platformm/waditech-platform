"use client";
import { useI18n } from "@/components/i18n-provider";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { contactAction } from "./actions";

/**
 * Contact form. Messages are validated and rate-limited on the server, then saved to
 * contact_messages, where staff read them in /admin/messages.
 *
 * TODO(launch): staff are not emailed about new messages yet. See contactAction in ./actions.ts.
 *
 * `compact` is the short footer version (name, email, message). `idPrefix` keeps element ids
 * unique when two forms are on one page (e.g. the footer form on /contact).
 */
export function ContactForm({ topic, compact, idPrefix = "contact" }: { topic?: string; compact?: boolean; idPrefix?: string }) {
  const { dict: d } = useI18n();
  const topics = Object.entries(d.contact.topics);
  const id = (k: string) => `${idPrefix}-${k}`;
  const safeTopic = topic && d.contact.topics[topic as keyof typeof d.contact.topics] ? topic : "general";
  return (
    <ActionForm action={contactAction} resetOnSuccess refreshOnSuccess={false} className={compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"}>
      <div><Label htmlFor={id("name")}>{d.common.name}</Label><Input id={id("name")} name="name" autoComplete="name" required /><FieldError name="name" /></div>
      <div><Label htmlFor={id("email")}>{d.common.email}</Label><Input id={id("email")} name="email" type="email" autoComplete="email" dir="ltr" required /><FieldError name="email" /></div>
      {compact ? (
        <input type="hidden" name="topic" value={safeTopic} />
      ) : (
        <>
          <div><Label htmlFor={id("phone")}>{d.common.phone} ({d.common.optional})</Label><Input id={id("phone")} name="phone" type="tel" autoComplete="tel" dir="ltr" /><FieldError name="phone" /></div>
          <div><Label htmlFor={id("topic")}>{d.contact.topic}</Label><Select id={id("topic")} name="topic" defaultValue={safeTopic}>{topics.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
        </>
      )}
      <div className={compact ? undefined : "sm:col-span-2"}><Label htmlFor={id("message")}>{d.contact.message}</Label><Textarea id={id("message")} name="message" required minLength={10} maxLength={5000} className={compact ? "min-h-24" : "min-h-36"} /><FieldError name="message" /></div>
      {/* honeypot: hidden from people, filled in by bots */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className={compact ? undefined : "sm:col-span-2"}><SubmitButton size={compact ? "md" : "lg"} pendingLabel={d.contact.sending}>{d.contact.send}</SubmitButton></div>
    </ActionForm>
  );
}
