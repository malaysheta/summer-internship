"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/brand/status-screen";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  useEffect(() => console.error(error), [error]);

  return (
    <StatusScreen code="500" label={t("errors.title")} title={t("errors.serverError")}>
      <Button onClick={reset} size="lg">
        <RotateCcw strokeWidth={1.25} />
        {t("errors.retry")}
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link href="/dashboard">{t("navigation.dashboard")}</Link>
      </Button>
    </StatusScreen>
  );
}
