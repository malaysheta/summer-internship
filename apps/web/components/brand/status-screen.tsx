import { BracketLabel, Spark, Wordmark } from "@/components/brand";

/** Full-page editorial message used by not-found and error boundaries. */
export function StatusScreen({
  code,
  label,
  title,
  children,
}: {
  code: string;
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(50%_45%_at_50%_45%,rgba(5,95,89,0.35),transparent_70%)]"
      />
      <header className="px-6 py-7 md:px-12">
        <Wordmark />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 text-center">
        <Spark className="size-4" />
        <BracketLabel>{label}</BracketLabel>
        <p className="font-serif text-[clamp(96px,16vw,200px)] leading-[0.85] tracking-[-0.04em] text-peach italic">{code}</p>
        <h1 className="max-w-xl text-[clamp(26px,3vw,38px)] leading-[1.15]">{title}</h1>
        {children && <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>}
      </main>
    </div>
  );
}
