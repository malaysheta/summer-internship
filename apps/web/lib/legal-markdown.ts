/**
 * One markdown pipeline for drafts, shared by the editor preview (React),
 * the PDF export (HTML) and the DOCX export (docx paragraphs).
 *
 * Everything walks marked's token stream; nothing is injected as raw HTML, so
 * text the LLM echoes from user intake can never become markup.
 */
import { marked, type Token, type Tokens } from "marked";

export const CITE_RE = /\[CITE:([^\]]+)\]/g;
const BANNER_RE = /AI-generated draft\s*[—–-]\s*not legal advice/i;

/**
 * Drop the Drafter's inline disclaimer paragraph ("--- **AI-generated draft —
 * not legal advice.** … ---"): the editor and every export render their own
 * banner, so showing it twice (with stray `---`) looks broken. The stored
 * draft keeps it — the Reviewer checks for it there.
 */
export function prepareLegalMarkdown(markdown: string): string {
  const paragraphs = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  // The Drafter fences the disclaimer as "--- … ---"; the Translator keeps that
  // shape in hi/gu/mr/ta, so match the fence as well as the English wording.
  const isBanner = (p: string) => {
    const t = p.trim();
    return BANNER_RE.test(t) || (t.startsWith("---") && t.endsWith("---") && t.length > 6 && t.includes("**"));
  };
  const kept = paragraphs.filter((p, i) => !(i < 4 && p.length < 1000 && isBanner(p)));
  return kept
    .join("\n\n")
    .replace(/^(\s*-{3,}\s*\n)+/, "") // leading horizontal rules left behind
    .trim();
}

export function lexLegalMarkdown(markdown: string): Token[] {
  return marked.lexer(prepareLegalMarkdown(markdown), { gfm: true });
}

/** Citation node ids in order of first appearance (1-based numbering = index + 1). */
export function citationOrder(markdown: string): string[] {
  const seen: string[] = [];
  for (const m of markdown.matchAll(CITE_RE)) if (!seen.includes(m[1])) seen.push(m[1]);
  return seen;
}

/** Split plain text into text / citation pieces. */
export function splitCitations(text: string): Array<{ text: string } | { cite: string }> {
  const out: Array<{ text: string } | { cite: string }> = [];
  let last = 0;
  for (const m of text.matchAll(CITE_RE)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ cite: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

// ─── HTML (PDF export) ──────────────────────────────────────────────────────

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineHtml(tokens: Token[] | undefined, cite: (id: string) => string): string {
  return (tokens ?? [])
    .map((t) => {
      switch (t.type) {
        case "strong": return `<strong>${inlineHtml((t as Tokens.Strong).tokens, cite)}</strong>`;
        case "em": return `<em>${inlineHtml((t as Tokens.Em).tokens, cite)}</em>`;
        case "del": return `<s>${inlineHtml((t as Tokens.Del).tokens, cite)}</s>`;
        case "codespan": return `<code>${escapeHtml((t as Tokens.Codespan).text)}</code>`;
        case "br": return "<br/>";
        case "link": return inlineHtml((t as Tokens.Link).tokens, cite);
        case "text": {
          const tt = t as Tokens.Text;
          if (tt.tokens?.length) return inlineHtml(tt.tokens, cite);
          return citeText(tt.text, cite);
        }
        default: return citeText((t as { text?: string }).text ?? t.raw, cite);
      }
    })
    .join("");
}

function citeText(text: string, cite: (id: string) => string): string {
  return splitCitations(text)
    .map((p) => ("cite" in p ? cite(p.cite) : escapeHtml(p.text)))
    .join("");
}

function blocksHtml(tokens: Token[], cite: (id: string) => string): string {
  return tokens
    .map((t) => {
      switch (t.type) {
        case "heading": {
          const h = t as Tokens.Heading;
          return `<h${h.depth}>${inlineHtml(h.tokens, cite)}</h${h.depth}>`;
        }
        case "paragraph": return `<p>${inlineHtml((t as Tokens.Paragraph).tokens, cite)}</p>`;
        case "text": {
          const tt = t as Tokens.Text;
          return tt.tokens?.length ? inlineHtml(tt.tokens, cite) : citeText(tt.text, cite);
        }
        case "list": {
          const l = t as Tokens.List;
          const tag = l.ordered ? "ol" : "ul";
          const start = l.ordered && l.start !== "" && l.start !== 1 ? ` start="${Number(l.start)}"` : "";
          return `<${tag}${start}>${l.items.map((i) => `<li>${blocksHtml(i.tokens, cite)}</li>`).join("")}</${tag}>`;
        }
        case "blockquote": return `<blockquote>${blocksHtml((t as Tokens.Blockquote).tokens, cite)}</blockquote>`;
        case "hr": return "<hr/>";
        case "code": return `<pre>${escapeHtml((t as Tokens.Code).text)}</pre>`;
        case "table": {
          const tb = t as Tokens.Table;
          const head = tb.header.map((c) => `<th>${inlineHtml(c.tokens, cite)}</th>`).join("");
          const rows = tb.rows.map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c.tokens, cite)}</td>`).join("")}</tr>`).join("");
          return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
        }
        case "space": return "";
        default: return `<p>${escapeHtml(t.raw)}</p>`;
      }
    })
    .join("\n");
}

/** Render a draft to safe HTML; `cite(id)` returns the HTML for one citation marker. */
export function legalMarkdownToHtml(markdown: string, cite: (id: string) => string): string {
  return blocksHtml(lexLegalMarkdown(markdown), cite);
}

export function hasTopHeading(markdown: string): boolean {
  return lexLegalMarkdown(markdown).some((t) => t.type === "heading" && (t as Tokens.Heading).depth === 1);
}
