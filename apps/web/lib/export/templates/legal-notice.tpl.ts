// Week 4 export template update
import { Document } from "docx";
import type { SupportedLanguage } from "@trionic/shared";

import { buildTemplateDocx, buildTemplateHtml, type Citation, type TemplateContext } from "./rti.tpl";

const TITLE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: "Legal Notice",
  hi: "कानूनी नोटिस",
  gu: "કાનૂની નોટિસ",
  mr: "कायदेशीर नोटीस",
  ta: "சட்ட நோட்டீஸ்",
};

export const legalNoticeTemplate = {
  buildHtml: (markdown: string, citations: Citation[], context: TemplateContext): string =>
    buildTemplateHtml(TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en, markdown, citations, context),

  buildDocx: (markdown: string, citations: Citation[], context: TemplateContext): Document =>
    buildTemplateDocx(TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en, markdown, citations, context),
};
