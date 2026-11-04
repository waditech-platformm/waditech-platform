"use client";
import { useEffect } from "react";
import { Container } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useI18n();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <Container className="py-24 text-center">
      <h1 className="text-2xl font-bold text-navy-900">{dict.common.errorTitle}</h1>
      <p className="mt-2 text-muted">{dict.common.errorBody}</p>
      {error.digest && <p className="mt-2 text-xs text-subtle">Ref: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>{dict.common.tryAgain}</Button>
    </Container>
  );
}
