import { cn } from "@/lib/utils";

/** Settings section: numbered label column + content, on a hairline. */
export function SectionFrame({
  index,
  title,
  description,
  danger,
  children,
}: {
  index: string;
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid gap-6 border-t border-border pt-8 lg:grid-cols-[240px_1fr] lg:gap-10",
        danger && "border-t-destructive/50"
      )}
    >
      <header className="space-y-2">
        <span className={cn("label-caps text-[10px]", danger ? "text-destructive" : "text-brand-soft")}>{index}</span>
        <h2 className={cn("text-[28px] leading-tight", danger && "text-destructive")}>{title}</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Uppercase field label + hint, shared by settings forms. */
export const fieldLabel = "label-caps block text-[10px] text-muted-foreground";
export const fieldHint = "text-[12px] leading-relaxed text-subtle-foreground";
