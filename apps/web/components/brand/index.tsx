import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

/** devx thin square-capped arrow (→). Inherits text colour. */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("size-3.5 shrink-0", className)}>
      <path d="M1 8h13m0 0L8.5 2.5M14 8l-5.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
}

/** 4-point "spark" star used as mark and divider ornament. */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-3 shrink-0 text-brand-soft", className)}>
      <path d="M12 0 L13.5 10.5 L24 12 L13.5 13.5 L12 24 L10.5 13.5 L0 12 L10.5 10.5 Z" fill="currentColor" />
    </svg>
  );
}

/** — ✦ — hairline divider. */
export function SparkDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)} aria-hidden>
      <span className="h-px flex-1 bg-hairline-soft" />
      <Spark />
      <span className="h-px flex-1 bg-hairline-soft" />
    </div>
  );
}

/** [ Label ] eyebrow. */
export function BracketLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("bracket-label", className)}>{children}</p>;
}

/**
 * Serif section title. `accent` renders as the trailing italic peach word(s),
 * e.g. <SectionHeading title="Your" accent="drafts" />.
 */
export function SectionHeading({
  label,
  title,
  accent,
  subtitle,
  as: Tag = "h1",
  className,
  children,
}: {
  label?: React.ReactNode;
  title: React.ReactNode;
  accent?: React.ReactNode;
  subtitle?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 space-y-3">
        {label && <BracketLabel>{label}</BracketLabel>}
        <Tag className="text-[clamp(32px,4vw,52px)] leading-[1.05] tracking-[-0.02em]">
          {title}
          {accent && (
            <>
              {" "}
              <em className="text-peach italic">{accent}</em>
            </>
          )}
        </Tag>
        {subtitle && <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Spark + serif wordmark; links home. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 text-foreground", className)}>
      <Spark className="size-3.5 transition-transform duration-700 ease-editorial group-hover:rotate-90" />
      <span className="font-serif text-[22px] leading-none tracking-[-0.01em]">
        Trionic <em className="text-peach italic">Adalat</em>
      </span>
    </Link>
  );
}

/** Splits a translated title into [lead, last word] so the last word can take the accent. */
export function splitAccent(text: string): [string, string] {
  const i = text.trimEnd().lastIndexOf(" ");
  return i === -1 ? ["", text] : [text.slice(0, i), text.slice(i + 1)];
}
