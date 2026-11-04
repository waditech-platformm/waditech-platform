"use client";
import { useI18n } from "@/components/i18n-provider";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { contactAction } from "./actions";
export function ContactForm({ topic }: { topic?: string }) {
  const { dict: d } = useI18n();
  const topics = Object.entries(d.contact.topics);
  return (
    <ActionForm action={contactAction} resetOnSuccess refreshOnSuccess={false} className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="name">{d.common.name}</Label><Input id="name" name="name" autoComplete="name" required /><FieldError name="name" /></div>
      <div><Label htmlFor="email">{d.common.email}</Label><Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required /><FieldError name="email" /></div>
      <div><Label htmlFor="phone">{d.common.phone} ({d.common.optional})</Label><Input id="phone" name="phone" type="tel" autoComplete="tel" dir="ltr" /><FieldError name="phone" /></div>
      <div><Label htmlFor="topic">{d.contact.topic}</Label><Select id="topic" name="topic" defaultValue={topic && d.contact.topics[topic as keyof typeof d.contact.topics] ? topic : "general"}>{topics.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
      <div className="sm:col-span-2"><Label htmlFor="message">{d.contact.message}</Label><Textarea id="message" name="message" required minLength={10} maxLength={5000} className="min-h-36" /><FieldError name="message" /></div>
      {/* honeypot — hidden from people, filled by bots */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="sm:col-span-2"><SubmitButton size="lg" pendingLabel={d.contact.sending}>{d.contact.send}</SubmitButton></div>
    </ActionForm>
  );
}
