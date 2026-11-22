import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { ArrowIcon, BracketLabel, Spark } from "@/components/brand";
import type { DocumentType } from "@trionic/shared";

export type EmptyStateType = "empty" | "loading" | "error" | "no-results";

const DOC_TYPE_CARDS: { type: DocumentType; label: string; description: string }[] = [
  { type: "rti_application", label: "RTI Application", description: "Request information from government bodies" },
  { type: "legal_notice", label: "Legal Notice", description: "Send a formal legal notice to any party" },
  { type: "nda", label: "NDA", description: "Non-disclosure agreement for confidentiality" },
  { type: "consumer_complaint", label: "Consumer Complaint", description: "File a complaint against a product or service" },
  { type: "cheque_bounce_notice", label: "Cheque Bounce Notice", description: "Legal notice under NI Act § 138" },
];

/** Centered editorial message: spark, serif title, muted line, optional action. */
function Message({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5 border-b border-border py-20 text-center">
      <Spark className="size-4" />
      <p className="font-serif text-[clamp(28px,3vw,40px)] leading-[1.1] tracking-[-0.01em]">{title}</p>
      <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

function getNoResultsMessage(activeFilter?: DocumentType): { title: string; description: string } {
  if (activeFilter) {
    const card = DOC_TYPE_CARDS.find((c) => c.type === activeFilter);
    return {
      title: `No ${card?.label ?? "documents"} found`,
      description: "You haven't created this type of document yet. Start one below.",
    };
  }
  return {
    title: "No results found",
    description: "No documents match your current filters. Try adjusting or clearing your filters.",
  };
}

interface EmptyStateProps {
  type: EmptyStateType;
  onRetry?: () => void;
  activeFilter?: DocumentType;
}

export function EmptyState({ type, onRetry, activeFilter }: EmptyStateProps) {

  if (type === "loading") {
    return (
      <div className="border-t border-border" aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-hairline-soft py-5">
            <div className="h-5 w-2/5 animate-pulse bg-muted" />
            <div className="h-3 w-24 animate-pulse bg-muted" />
            <div className="ml-auto h-3 w-16 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "error") {
    return (
      <Message
        title="Failed to load documents"
        description="Something went wrong while fetching your documents. Please try again."
      >
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw strokeWidth={1.25} />
            Try again
          </Button>
        )}
      </Message>
    );
  }

  if (type === "no-results") {
    const { title, description } = getNoResultsMessage(activeFilter);
    return (
      <Message title={title} description={description}>
        <Button asChild>
          <Link href="/new">
            New Draft
            <ArrowIcon />
          </Link>
        </Button>
      </Message>
    );
  }

  return (
    <div className="grid gap-10 border-t border-border pt-10 lg:grid-cols-[300px_1fr] lg:gap-12">
      <div className="space-y-4">
        <BracketLabel>No drafts yet</BracketLabel>
        <p className="font-serif text-[32px] leading-[1.1] tracking-[-0.01em]">
          Start your <em className="text-peach italic">first</em> draft.
        </p>
        <p className="text-[14px] leading-relaxed text-muted-foreground">Choose a document type below.</p>
      </div>
      <ul className="border-t border-border">
        {DOC_TYPE_CARDS.map(({ type, label, description }, i) => (
          <li key={type}>
            <Link
              href={`/new?doc_type=${type}`}
              className="group grid grid-cols-[48px_1fr_auto] items-center gap-4 border-b border-border py-5 transition-colors duration-[180ms] hover:bg-white/[0.02] md:grid-cols-[64px_minmax(200px,280px)_1fr_auto]"
            >
              <span className="label-caps text-brand-soft">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-serif text-[20px] leading-tight group-hover:text-peach">{label}</span>
              <span className="hidden text-[13px] text-muted-foreground md:block">{description}</span>
              <ArrowIcon className="text-brand-soft transition-transform duration-300 ease-editorial group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
