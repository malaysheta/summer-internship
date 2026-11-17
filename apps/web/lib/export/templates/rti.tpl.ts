// Week 4 export template update
import fs from "node:fs";
import path from "node:path";

import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat, PageNumber,
  Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import type { Token, Tokens } from "marked";
import { escapeHtml, hasTopHeading, legalMarkdownToHtml, lexLegalMarkdown, splitCitations } from "@/lib/legal-markdown";
import type { SupportedLanguage } from "@trionic/shared";

export type Citation = {
  /** Node id exactly as written in the draft's [CITE:…] marker (used for numbering). */
  id: string;
  /** Canonical PageIndex node id shown in the appendix. */
  ref?: string;
  text: string;
};

export type TemplateContext = {
  language: SupportedLanguage;
  includeAppendix: boolean;
};

import en from "../../../messages/en.json";
import hi from "../../../messages/hi.json";
import gu from "../../../messages/gu.json";
import mr from "../../../messages/mr.json";
import ta from "../../../messages/ta.json";

// Same disclaimer wording the UI shows for each locale (messages/*.json common.disclaimer).
const BANNERS: Record<SupportedLanguage, string> = {
  en: en.common.disclaimer, hi: hi.common.disclaimer, gu: gu.common.disclaimer, mr: mr.common.disclaimer, ta: ta.common.disclaimer,
};
const bannerFor = (language: SupportedLanguage) => BANNERS[language] ?? BANNERS.en;
const DEFAULT_HTML_FONT = "Georgia, 'Times New Roman', serif";
const DEFAULT_DOCX_FONT = "Times New Roman";

const FONT_FILES: Partial<Record<SupportedLanguage, { family: string; file: string }>> = {
  hi: { family: "Noto Sans Devanagari", file: "NotoSansDevanagari-Regular.ttf" },
  mr: { family: "Noto Sans Devanagari", file: "NotoSansDevanagari-Regular.ttf" },
  gu: { family: "Noto Sans Gujarati", file: "NotoSansGujarati-Regular.ttf" },
  ta: { family: "Noto Sans Tamil", file: "NotoSansTamil-Regular.ttf" },
};

const APPENDIX_TITLES: Record<SupportedLanguage, string> = {
  en: "Citation Appendix",
  hi: "उद्धरण परिशिष्ट",
  gu: "સંદર્ભ પરિશિષ્ટ",
  mr: "उद्धरण परिशिष्ट",
  ta: "மேற்கோள் இணைப்பு",
};

const TITLE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: "RTI Application",
  hi: "आरटीआई आवेदन",
  gu: "આરટીઆઈ અરજી",
  mr: "आरटीआय अर्ज",
  ta: "ஆர்டிஐ விண்ணப்பம்",
};


function getAppendixTitle(language: SupportedLanguage) {
  return APPENDIX_TITLES[language] ?? APPENDIX_TITLES.en;
}

function getDocxFont(language: SupportedLanguage) {
  return FONT_FILES[language]?.family ?? DEFAULT_DOCX_FONT;
}

function getHtmlFont(language: SupportedLanguage) {
  const family = FONT_FILES[language]?.family;
  return family ? `'${family}', ${DEFAULT_HTML_FONT}` : DEFAULT_HTML_FONT;
}

function getEmbeddedFontCss(language: SupportedLanguage) {
  const font = FONT_FILES[language];
  if (!font) {
    return "";
  }

  const fontPath = path.join(process.cwd(), "public", "fonts", font.file);
  if (!fs.existsSync(fontPath)) {
    return "";
  }

  const encoded = fs.readFileSync(fontPath).toString("base64");
  return `
    @font-face {
      font-family: '${font.family}';
      src: url(data:font/ttf;base64,${encoded}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }
  `;
}

// ─── Shared rendering (all 5 doc types) ─────────────────────────────────────
// Body + appendix come from lib/legal-markdown (same token stream as the
// editor preview), so headings, lists, emphasis, rules and tables survive
// export instead of printing as raw "##" / "**" text.

function citationNumber(citations: Citation[], id: string) {
  const i = citations.findIndex((c) => c.id === id);
  return i === -1 ? null : i + 1;
}

const PDF_CSS = (fontFamily: string) => `
  @page { size: A4; margin: 22mm 20mm 24mm 20mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${fontFamily}; font-size: 11.5pt; line-height: 1.6; color: #111; }
  .banner { border: 1px solid #f0c9a8; background: #fff7ef; color: #9a3412; font: 600 8.5pt/1.4 -apple-system, "Segoe UI", Arial, sans-serif;
            text-align: center; padding: 6px 10px; border-radius: 4px; margin-bottom: 22px; letter-spacing: .02em; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: .04em; margin: 4px 0 6px; line-height: 1.35; }
  .subtitle { text-align: center; font-weight: 600; text-decoration: underline; margin: 0 0 18px; }
  h1 + * { margin-top: 16px; }
  h2 { font-size: 12.5pt; margin: 20px 0 8px; padding-bottom: 3px; border-bottom: 1px solid #d4d4d4; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 14px 0 6px; page-break-after: avoid; }
  p { margin: 0 0 9px; text-align: justify; orphans: 3; widows: 3; }
  ul, ol { margin: 0 0 10px; padding-left: 24px; }
  li { margin: 0 0 4px; text-align: justify; }
  li > p { margin: 0; }
  hr { border: 0; border-top: 1px solid #c8c8c8; margin: 16px 0; }
  blockquote { margin: 0 0 10px; padding-left: 12px; border-left: 3px solid #d4d4d4; color: #444; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 12px; font-size: 10.5pt; }
  th, td { border: 1px solid #bdbdbd; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; }
  sup.cite { font-size: 7.5pt; color: #1d4ed8; font-weight: 600; margin-left: 1px; }
  .appendix { margin-top: 28px; padding-top: 12px; border-top: 1.5px solid #111; page-break-inside: avoid; }
  .appendix h2 { border: 0; margin: 0 0 8px; font-size: 11.5pt; text-transform: uppercase; letter-spacing: .05em; }
  .appendix ol { font-size: 10pt; padding-left: 22px; }
  .appendix .nid { color: #666; font-family: Menlo, Consolas, monospace; font-size: 8.5pt; }
`;

function buildAppendixHtml(citations: Citation[], language: SupportedLanguage) {
  if (citations.length === 0) return "";
  const items = citations
    .map((c) => `<li>${escapeHtml(c.text)} <span class="nid">[${escapeHtml(c.ref ?? c.id)}]</span></li>`)
    .join("");
  return `<section class="appendix"><h2>${escapeHtml(getAppendixTitle(language))}</h2><ol>${items}</ol></section>`;
}

export function buildTemplateHtml(
  title: string,
  markdown: string,
  citations: Citation[],
  context: TemplateContext,
  extraHeader?: string,
) {
  const fontCss = getEmbeddedFontCss(context.language);
  const fontFamily = getHtmlFont(context.language);
  const body = legalMarkdownToHtml(markdown, (id) => {
    const n = context.includeAppendix ? citationNumber(citations, id) : null;
    return n ? `<sup class="cite">${n}</sup>` : "";
  });
  // Drafts normally carry their own "# TITLE"; only add the template title when they don't.
  const heading = hasTopHeading(markdown)
    ? ""
    : `<h1>${escapeHtml(title)}</h1>${extraHeader ? `<p class="subtitle">${escapeHtml(extraHeader)}</p>` : ""}`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${fontCss}${PDF_CSS(fontFamily)}</style>
  </head>
  <body>
    <div class="banner">${escapeHtml(bannerFor(context.language))}</div>
    ${heading}
    ${body}
    ${context.includeAppendix ? buildAppendixHtml(citations, context.language) : ""}
  </body>
</html>`;
}

/** Footer for puppeteer's page.pdf({ displayHeaderFooter: true }). */
export const pdfFooter = (language: SupportedLanguage) => `<div style="width:100%;font:7.5pt Arial,sans-serif;color:#888;padding:0 20mm;display:flex;justify-content:space-between;">
  <span>${escapeHtml(bannerFor(language))}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

// ─── DOCX ───────────────────────────────────────────────────────────────────

type RunStyle = { bold?: boolean; italics?: boolean; strike?: boolean };

function docxRuns(tokens: Token[] | undefined, font: string, citations: Citation[], includeAppendix: boolean, style: RunStyle = {}): TextRun[] {
  const runs: TextRun[] = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "strong": runs.push(...docxRuns((t as Tokens.Strong).tokens, font, citations, includeAppendix, { ...style, bold: true })); break;
      case "em": runs.push(...docxRuns((t as Tokens.Em).tokens, font, citations, includeAppendix, { ...style, italics: true })); break;
      case "del": runs.push(...docxRuns((t as Tokens.Del).tokens, font, citations, includeAppendix, { ...style, strike: true })); break;
      case "link": runs.push(...docxRuns((t as Tokens.Link).tokens, font, citations, includeAppendix, style)); break;
      case "br": runs.push(new TextRun({ break: 1, font })); break;
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens?.length) { runs.push(...docxRuns(tt.tokens, font, citations, includeAppendix, style)); break; }
        runs.push(...textRuns(tt.text, font, citations, includeAppendix, style));
        break;
      }
      default:
        runs.push(...textRuns((t as { text?: string }).text ?? t.raw, font, citations, includeAppendix, style));
    }
  }
  return runs;
}

function textRuns(text: string, font: string, citations: Citation[], includeAppendix: boolean, style: RunStyle): TextRun[] {
  return splitCitations(text).flatMap((p) => {
    if ("cite" in p) {
      const n = includeAppendix ? citationNumber(citations, p.cite) : null;
      return n ? [new TextRun({ text: String(n), superScript: true, color: "1D4ED8", bold: true, font })] : [];
    }
    return [new TextRun({ text: p.text, font, bold: style.bold, italics: style.italics, strike: style.strike })];
  });
}

type DocxState = { listInstance: number; configs: ReturnType<typeof numberingConfig>[] };

function numberingConfig(reference: string, startLevel = 0, start = 1) {
  return {
    reference,
    levels: [0, 1, 2].map((lvl) => ({
      level: lvl,
      start: lvl === Math.min(startLevel, 2) ? start : 1,
      format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][lvl],
      text: lvl === 0 ? "%1." : lvl === 1 ? "(%2)" : "(%3)",
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { left: 720 * (lvl + 1), hanging: 360 } } },
    })),
  };
}

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4] as const;

function docxBlocks(
  tokens: Token[],
  font: string,
  citations: Citation[],
  includeAppendix: boolean,
  state: DocxState,
  level = 0,
): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        out.push(new Paragraph({
          heading: HEADINGS[Math.min(h.depth, 4) - 1],
          alignment: h.depth === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: h.depth === 1 ? 120 : 280, after: 120 },
          children: docxRuns(h.tokens, font, citations, includeAppendix, { bold: true }),
        }));
        break;
      }
      case "paragraph":
        out.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 140, line: 320 },
          children: docxRuns((t as Tokens.Paragraph).tokens, font, citations, includeAppendix),
        }));
        break;
      case "list": {
        const l = t as Tokens.List;
        const instance = ++state.listInstance;
        // Ordered lists continue across sections ("3." after a heading): give
        // each list its own numbering definition starting at its first number.
        const reference = `ol-${instance}`;
        if (l.ordered) state.configs.push(numberingConfig(reference, level, typeof l.start === "number" ? l.start : 1));
        for (const item of l.items) {
          const [first, ...rest] = item.tokens;
          const firstTokens = first && (first.type === "text" || first.type === "paragraph") ? (first as Tokens.Text).tokens ?? [] : [];
          out.push(new Paragraph({
            ...(l.ordered
              ? { numbering: { reference, level: Math.min(level, 2) } }
              : { bullet: { level: Math.min(level, 2) } }),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 80, line: 300 },
            children: firstTokens.length ? docxRuns(firstTokens, font, citations, includeAppendix) : textRuns(first?.raw ?? "", font, citations, includeAppendix, {}),
          }));
          out.push(...docxBlocks(rest, font, citations, includeAppendix, state, level + 1));
        }
        break;
      }
      case "blockquote":
        out.push(...docxBlocks((t as Tokens.Blockquote).tokens, font, citations, includeAppendix, state, level));
        break;
      case "hr":
        out.push(new Paragraph({ spacing: { before: 120, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 1 } }, children: [] }));
        break;
      case "table": {
        const tb = t as Tokens.Table;
        const cell = (tokens: Token[], header: boolean) =>
          new TableCell({ children: [new Paragraph({ children: docxRuns(tokens, font, citations, includeAppendix, header ? { bold: true } : {}) })] });
        out.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: tb.header.map((c) => cell(c.tokens, true)) }),
            ...tb.rows.map((r) => new TableRow({ children: r.map((c) => cell(c.tokens, false)) })),
          ],
        }));
        out.push(new Paragraph({ children: [] }));
        break;
      }
      case "space":
        break;
      default:
        out.push(new Paragraph({ spacing: { after: 140 }, children: textRuns(t.raw, font, citations, includeAppendix, {}) }));
    }
  }
  return out;
}

export function buildTemplateDocx(
  title: string,
  markdown: string,
  citations: Citation[],
  context: TemplateContext,
  extraHeader?: string,
) {
  const font = getDocxFont(context.language);
  const children: Array<Paragraph | Table> = [];

  if (!hasTopHeading(markdown)) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: title, bold: true, font })],
    }));
    if (extraHeader) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 280 },
        children: [new TextRun({ text: extraHeader, bold: true, underline: {}, font })],
      }));
    }
  }

  const state: DocxState = { listInstance: 0, configs: [] };
  children.push(...docxBlocks(lexLegalMarkdown(markdown), font, citations, context.includeAppendix, state));

  if (context.includeAppendix && citations.length > 0) {
    children.push(new Paragraph({
      spacing: { before: 400, after: 160 },
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: "111111", space: 6 } },
      children: [new TextRun({ text: getAppendixTitle(context.language).toUpperCase(), bold: true, font })],
    }));
    citations.forEach((c) => {
      children.push(new Paragraph({
        numbering: { reference: "appendix", level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: c.text, font, size: 20 }),
          new TextRun({ text: `  [${c.ref ?? c.id}]`, font: "Consolas", size: 16, color: "666666" }),
        ],
      }));
    });
  }

  return new Document({
    styles: {
      default: { document: { run: { font, size: 23 }, paragraph: { spacing: { line: 320 } } } },
    },
    numbering: { config: [numberingConfig("appendix"), ...state.configs] },
    sections: [{
      properties: { page: { margin: { top: 1250, bottom: 1300, left: 1150, right: 1150 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: bannerFor(context.language), color: "9A3412", bold: true, size: 16, font })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 16, color: "888888", font }),
            ],
          })],
        }),
      },
      children,
    }],
  });
}

export const rtiTemplate = {
  buildHtml: (markdown: string, citations: Citation[], context: TemplateContext): string =>
    buildTemplateHtml(TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en, markdown, citations, context),

  buildDocx: (markdown: string, citations: Citation[], context: TemplateContext): Document =>
    buildTemplateDocx(TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en, markdown, citations, context),
};
