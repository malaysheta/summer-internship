import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowIcon } from "@/components/brand";
import { StatusScreen } from "@/components/brand/status-screen";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <StatusScreen code="404" label={t("errors.title")} title={t("errors.notFound")}>
      <Button asChild size="lg">
        <Link href="/dashboard">
          {t("navigation.dashboard")}
          <ArrowIcon />
        </Link>
      </Button>
    </StatusScreen>
  );
}
