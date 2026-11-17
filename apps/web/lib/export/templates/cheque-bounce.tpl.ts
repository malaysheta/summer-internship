// Week 4 export template update
import { Document } from "docx";
import type { SupportedLanguage } from "@trionic/shared";

import { buildTemplateDocx, buildTemplateHtml, type Citation, type TemplateContext } from "./rti.tpl";

const TITLE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: "Cheque Bounce Notice",
  hi: "चेक बाउंस नोटिस",
  gu: "ચેક બાઉન્સ નોટિસ",
  mr: "चेक बाउन्स नोटीस",
  ta: "காசோலைத் திருப்பிச் செலுத்தல் நோட்டீஸ்",
};

const HEADER_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: "NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881",
  hi: "परक्राम्य लिखत अधिनियम, 1881 की धारा 138 के अंतर्गत नोटिस",
  gu: "પરક્રામ્ય લખત અધિનિયમ, 1881 ની કલમ 138 હેઠળ નોટિસ",
  mr: "परक्राम्य लिखत अधिनियम, 1881 च्या कलम 138 अंतर्गत नोटीस",
  ta: "மாற்றத்தக்க ஆவணங்கள் சட்டம், 1881 இன் பிரிவு 138 கீழ் நோட்டீஸ்",
};

export const chequeBounceTemplate = {
  buildHtml: (markdown: string, citations: Citation[], context: TemplateContext): string =>
    buildTemplateHtml(
      TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en,
      markdown,
      citations,
      context,
      HEADER_BY_LANGUAGE[context.language] ?? HEADER_BY_LANGUAGE.en,
    ),

  buildDocx: (markdown: string, citations: Citation[], context: TemplateContext): Document =>
    buildTemplateDocx(
      TITLE_BY_LANGUAGE[context.language] ?? TITLE_BY_LANGUAGE.en,
      markdown,
      citations,
      context,
      HEADER_BY_LANGUAGE[context.language] ?? HEADER_BY_LANGUAGE.en,
    ),
};
