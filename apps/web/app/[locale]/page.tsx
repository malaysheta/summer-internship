import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowIcon, BracketLabel, Spark, SparkDivider, Wordmark } from "@/components/brand";
import { Reveal } from "@/components/brand/reveal";

const DOC_KEYS = ["rti", "notice", "nda", "consumer", "cheque"] as const;

/** Side gutter of the framed-grid hero; guide lines and crosshairs sit on it. */
const GUTTER = "left-6 md:left-20 lg:left-40 xl:left-72";
const GUTTER_R = "right-6 md:right-20 lg:right-40 xl:right-72";

function Crosshair({ className }: { className: string }) {
  return (
    <span aria-hidden className={`absolute size-6 -translate-x-1/2 -translate-y-1/2 ${className}`}>
      <span className="absolute top-1/2 left-0 h-px w-full bg-white/50" />
      <span className="absolute top-0 left-1/2 h-full w-px bg-white/50" />
    </span>
  );
}

export default async function Home() {
  const t = await getTranslations();

  // Every locale's headline is two sentences ("…. …." or "…। …।"): the second
  // becomes the italic accent line without needing extra translation keys.
  const headline = t("landing.headline");
  const split = headline.search(/[.।]\s/);
  const [lead, accent] = split === -1 ? [headline, ""] : [headline.slice(0, split + 1), headline.slice(split + 2)];
  const docNames = t("landing.subheadline").split(" · ");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Disclaimer strip */}
      <div className="flex items-center justify-center gap-2.5 border-b border-hairline-soft px-4 py-2 text-center text-[11px] tracking-[0.04em] text-muted-foreground">
        <Spark className="size-2.5" />
        {t("common.disclaimer")}
      </div>

      {/* Framed-grid hero */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_70%_30%,rgba(5,95,89,0.45),transparent_70%),radial-gradient(40%_40%_at_10%_90%,rgba(179,97,65,0.18),transparent_70%)]"
        />
        {/* Guide lines */}
        <span aria-hidden className={`absolute inset-y-0 w-px bg-gradient-to-b from-white/0 via-white/25 to-white/0 ${GUTTER}`} />
        <span aria-hidden className={`absolute inset-y-0 w-px bg-gradient-to-b from-white/0 via-white/25 to-white/0 ${GUTTER_R}`} />
        <span aria-hidden className="absolute inset-x-0 top-[96px] h-px bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
        <span aria-hidden className="absolute inset-x-0 bottom-[120px] h-px bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
        <Crosshair className={`top-[96px] ${GUTTER}`} />
        <Crosshair className={`top-[96px] translate-x-1/2! ${GUTTER_R}`} />
        <Crosshair className={`bottom-[120px] translate-y-1/2! ${GUTTER}`} />
        <Crosshair className={`bottom-[120px] translate-x-1/2! translate-y-1/2! ${GUTTER_R}`} />

        {/* Nav */}
        <header className="relative z-10 mx-auto flex h-[96px] max-w-[1440px] items-center justify-between px-6 md:px-20 lg:px-40 xl:px-72">
          <Wordmark />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="secondary" size="sm" className="h-9">
              <Link href="/auth/sign-in">{t("common.signIn")}</Link>
            </Button>
          </div>
        </header>

        <div className="relative mx-auto flex min-h-[calc(88vh-96px)] max-w-[1440px] flex-col justify-center px-10 pt-16 pb-[160px] md:px-28 lg:px-52 xl:px-80">
          <BracketLabel>{t("app.name")}</BracketLabel>
          <h1 className="mt-8 text-[clamp(44px,7vw,96px)] leading-[0.98] tracking-[-0.03em]">
            <span className="block">{lead}</span>
            {accent && <em className="block text-right text-peach italic">{accent}</em>}
          </h1>
          <div className="mt-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[480px] text-[15px] leading-relaxed text-muted-foreground">{t("landing.feature1")}.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  {t("landing.getStarted")}
                  <ArrowIcon />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Reveal>
        {/* Features: label column + serif statements */}
        <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-20 md:px-20 md:py-28 lg:grid-cols-[300px_1fr] lg:gap-12">
          <BracketLabel>{t("landing.features")}</BracketLabel>
          <ol className="border-t border-border">
            {[t("landing.feature1"), t("landing.feature2"), t("landing.feature3")].map((text, i) => (
              <li
                key={i}
                data-reveal
                style={{ transitionDelay: `${i * 80}ms` }}
                className="grid grid-cols-[56px_1fr] items-baseline gap-4 border-b border-border py-8 md:grid-cols-[100px_1fr]"
              >
                <span className="label-caps text-brand-soft">{String(i + 1).padStart(2, "0")}</span>
                <p className="font-serif text-[clamp(24px,2.6vw,36px)] leading-[1.15] tracking-[-0.01em]">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Documents it drafts */}
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-20 md:px-20 md:py-28 lg:grid-cols-[300px_1fr] lg:gap-12">
            <BracketLabel>{t("navigation.newDraft")}</BracketLabel>
            <ul className="border-t border-border">
              {DOC_KEYS.map((key, i) => (
                <li key={key} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                  <Link
                    href="/new"
                    className="group grid grid-cols-1 gap-2 border-b border-border py-6 transition-colors duration-[180ms] hover:bg-white/[0.02] md:grid-cols-[minmax(220px,320px)_1fr_auto] md:items-center md:gap-8"
                  >
                    <span className="font-serif text-[22px] leading-tight">{docNames[i] ?? key}</span>
                    <span className="text-[14px] leading-relaxed text-muted-foreground">{t(`documentDescriptions.${key}`)}</span>
                    <ArrowIcon className="hidden text-brand-soft transition-transform duration-300 ease-editorial group-hover:translate-x-1 md:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA band */}
        <section className="relative isolate overflow-hidden border-t border-border bg-[linear-gradient(135deg,#001e1b_0%,#000_60%)]">
          <div aria-hidden className="absolute -right-40 -bottom-40 -z-10 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(179,97,65,0.28),transparent_65%)]" />
          <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 md:px-20 md:py-24 lg:grid-cols-[1fr_360px] lg:items-end">
            <h2 data-reveal className="text-[clamp(36px,5vw,64px)] leading-[1.02] tracking-[-0.02em]">
              {lead} <em className="text-peach italic">{accent}</em>
            </h2>
            <Button asChild size="lg" className="w-full justify-between">
              <Link href="/dashboard">
                {t("landing.getStarted")}
                <ArrowIcon />
              </Link>
            </Button>
          </div>
        </section>
      </Reveal>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1440px] space-y-8 px-6 py-12 md:px-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <Wordmark />
            <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{t("landing.subheadline")}</p>
          </div>
          <SparkDivider />
          <p className="text-[11px] tracking-[0.04em] text-subtle-foreground">
            © {new Date().getFullYear()} {t("common.brandName")} · {t("common.disclaimer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
