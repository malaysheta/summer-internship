"use client";

import React from "react";
import type { Token, Tokens } from "marked";
import { lexLegalMarkdown, splitCitations } from "@/lib/legal-markdown";

/**
 * Renders a legal draft (markdown + [CITE:<node_id>] markers) as a typeset
 * document. Same token stream as the PDF/DOCX exports, so what you see is what
 * you export. Citations render through `renderCite` (the interactive badge).
 */
export function LegalMarkdownView({
  markdown,
  renderCite,
}: {
  markdown: string;
  renderCite: (nodeId: string, key: string) => React.ReactNode;
}) {
  const tokens = React.useMemo(() => lexLegalMarkdown(markdown), [markdown]);

  const text = (value: string, key: string) =>
    splitCitations(value).map((p, i) => ("cite" in p ? renderCite(p.cite, `${key}-c${i}`) : <React.Fragment key={`${key}-t${i}`}>{p.text}</React.Fragment>));

  const inline = (toks: Token[] | undefined, key: string): React.ReactNode[] =>
    (toks ?? []).map((t, i) => {
      const k = `${key}.${i}`;
      switch (t.type) {
        case "strong": return <strong key={k} className="font-semibold text-foreground">{inline((t as Tokens.Strong).tokens, k)}</strong>;
        case "em": return <em key={k}>{inline((t as Tokens.Em).tokens, k)}</em>;
        case "del": return <s key={k}>{inline((t as Tokens.Del).tokens, k)}</s>;
        case "codespan": return <code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{(t as Tokens.Codespan).text}</code>;
        case "br": return <br key={k} />;
        case "link": return <React.Fragment key={k}>{inline((t as Tokens.Link).tokens, k)}</React.Fragment>;
        case "text": {
          const tt = t as Tokens.Text;
          return <React.Fragment key={k}>{tt.tokens?.length ? inline(tt.tokens, k) : text(tt.text, k)}</React.Fragment>;
        }
        default: return <React.Fragment key={k}>{text((t as { text?: string }).text ?? t.raw, k)}</React.Fragment>;
      }
    });

  const blocks = (toks: Token[], key: string, tight = false): React.ReactNode[] =>
    toks.map((t, i) => {
      const k = `${key}/${i}`;
      switch (t.type) {
        case "heading": {
          const h = t as Tokens.Heading;
          if (h.depth === 1)
            return <h1 key={k} className="mt-2 mb-6 text-center font-serif text-[1.35rem] font-bold uppercase leading-snug tracking-wide text-foreground">{inline(h.tokens, k)}</h1>;
          if (h.depth === 2)
            return <h2 key={k} className="mt-8 mb-3 border-b border-border pb-1.5 font-serif text-lg font-bold text-foreground">{inline(h.tokens, k)}</h2>;
          return <h3 key={k} className="mt-5 mb-2 font-serif text-base font-semibold text-foreground">{inline(h.tokens, k)}</h3>;
        }
        case "paragraph":
          return tight
            ? <React.Fragment key={k}>{inline((t as Tokens.Paragraph).tokens, k)}</React.Fragment>
            : <p key={k} className="mb-4 text-justify font-serif text-[15px] leading-7 text-foreground hyphens-auto">{inline((t as Tokens.Paragraph).tokens, k)}</p>;
        case "text": {
          const tt = t as Tokens.Text;
          return <React.Fragment key={k}>{tt.tokens?.length ? inline(tt.tokens, k) : text(tt.text, k)}</React.Fragment>;
        }
        case "list": {
          const l = t as Tokens.List;
          const items = l.items.map((item, j) => (
            <li key={`${k}-${j}`} className="pl-1 leading-7">{blocks(item.tokens, `${k}-${j}`, !l.loose)}</li>
          ));
          return l.ordered
            ? <ol key={k} start={typeof l.start === "number" ? l.start : undefined} className="mb-4 list-decimal space-y-1.5 pl-7 font-serif text-[15px] text-foreground">{items}</ol>
            : <ul key={k} className="mb-4 list-disc space-y-1.5 pl-7 font-serif text-[15px] text-foreground">{items}</ul>;
        }
        case "blockquote":
          return <blockquote key={k} className="mb-4 border-l-4 border-border pl-4 italic text-muted-foreground">{blocks((t as Tokens.Blockquote).tokens, k)}</blockquote>;
        case "hr":
          return <hr key={k} className="my-6 border-border" />;
        case "code":
          return <pre key={k} className="mb-4 overflow-x-auto rounded bg-muted p-3 font-mono text-xs">{(t as Tokens.Code).text}</pre>;
        case "table": {
          const tb = t as Tokens.Table;
          return (
            <div key={k} className="mb-5 overflow-x-auto">
              <table className="w-full border-collapse font-serif text-sm">
                <thead>
                  <tr>{tb.header.map((c, j) => <th key={j} className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">{inline(c.tokens, `${k}-h${j}`)}</th>)}</tr>
                </thead>
                <tbody>
                  {tb.rows.map((r, ri) => (
                    <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-border px-3 py-2 align-top">{inline(c.tokens, `${k}-${ri}-${ci}`)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        case "space":
          return null;
        default:
          return <p key={k} className="mb-4 font-serif text-[15px] leading-7">{t.raw}</p>;
      }
    });

  return <article className="mx-auto max-w-[46rem] break-words">{blocks(tokens, "b")}</article>;
}
