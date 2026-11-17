// Week 4 export template update
import { Document } from "docx";
import type { SupportedLanguage } from "@trionic/shared";

import { buildTemplateDocx, buildTemplateHtml, type Citation, type TemplateContext } from "./rti.tpl";

const TITLE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: "Consumer Complaint",
  hi: "उपभोक्ता शिकायत",
  gu: "ઉપભોક્તા ફરિયાદ",
  mr: "ग्राहक तक्रार",
  ta: "நுகர்வோர் புகார்",
};

export const consumerComplaintTemplate = {
  buildHtml: (markdown: string, citations: Citation[], context: TemplateContext): string =>
    buildTemplateHtml(TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en, markdown, citations, context),

  buildDocx: (markdown: string, citations: Citation[], context: TemplateContext): Document =>
    buildTemplateDocx(TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en, markdown, citations, context),
};
