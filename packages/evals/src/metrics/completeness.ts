import type { EvalMetric } from "@trionic/shared";
import type { Fixture } from "../types";

export type CompletenessResult = {
  metric: "completeness";
  required_sections: string[];
  missing_sections: string[];
  completeness_rate: number;
  completeness_score: number; // alias for run.ts compat
  eval_metric: EvalMetric;
  status: "pass" | "fail";
};

// Per-doc-type required section definitions (W4)
const DOC_TYPE_REQUIRED_SECTIONS: Record<string, string[]> = {
  rti_application:      ["pio_address", "subject", "info_sought", "declaration", "date_signature"],
  legal_notice:         ["sender_address", "recipient_address", "subject", "facts", "demand", "date_signature"],
  nda:                  ["party_a", "party_b", "confidential_info_definition", "obligations", "term", "date_signature"],
  consumer_complaint:   ["forum_address", "complainant_details", "respondent_details", "relief_sought", "declaration", "date_signature"],
  cheque_bounce_notice: ["sender_address", "recipient_address", "cheque_details", "demand_amount", "15_day_notice", "date_signature"],
};

// Keyword mapping for required sections — RTI (W2+W3) + new doc types (W4)
const SECTION_KEYWORDS: Record<string, string[]> = {
  // RTI fields
  address:          ["pio", "public information officer", "to,", "to\n", "officer", "address"],
  pio_address:      ["pio", "public information officer", "to,", "to\n", "officer", "address"],
  subject:          ["subject:", "sub:", "subject –", "subject-", "regarding", "re:"],
  sections_sought:  ["information sought", "particulars of information", "information sought:", "information requested"],
  information_requested: ["information sought", "particulars of information", "information requested:"],
  "info sought":    ["information sought", "particulars of information", "information sought:"],
  info_sought:      ["information sought", "particulars of information", "information sought:"],
  declaration:      ["declare", "i am a citizen", "citizen of india", "fee", "ipo", "postal order", "payment", "rs. 10", "rs 10"],
  payment_details_declaration: ["declare", "citizen of india", "fee", "ipo", "postal order", "payment"],
  applicant_details: ["applicant", "name of applicant", "i,"],
  appeal_grounds:   ["appeal", "grounds", "aggrieved", "rejection", "first appeal"],
  date:             ["date:", "date :", "2025", "2026", "dated"],
  signature:        ["signature:", "sincerely", "faithfully", "yours truly", "applicant"],
  // W3 composite field: date AND signature must both be present
  "date+signature": ["date:", "date :", "2025", "2026", "dated", "signature:", "sincerely", "faithfully"],
  date_signature:   ["date:", "date :", "2025", "2026", "dated", "signature:", "sincerely", "faithfully", "yours faithfully", "yours sincerely"],

  // Legal notice fields (W4)
  sender_address:    ["from:", "sender:", "advocate for", "on behalf of", "i,", "we,", "the undersigned"],
  recipient_address: ["to,", "to:", "addressed to", "dear sir", "dear madam", "the proprietor", "the managing director"],
  facts:             ["facts", "background", "cause of action", "particulars", "details of", "it is submitted that", "whereas"],
  demand:            ["demand", "called upon", "pay", "comply", "cease", "vacate", "restore", "demanded", "failing which"],

  // NDA fields (W4)
  party_a:                     ["party a", "disclosing party", "first party", "company", "employer", "organization"],
  party_b:                     ["party b", "receiving party", "second party", "employee", "contractor", "recipient"],
  confidential_info_definition:["confidential information", "proprietary information", "trade secrets", "confidential means", "includes but is not limited to"],
  obligations:                 ["shall not disclose", "obligations", "undertakes", "agrees not to", "must not", "covenant"],
  term:                        ["term", "duration", "period of", "valid for", "expires", "effective from", "years from"],

  // Consumer complaint fields (W4)
  forum_address:        ["district consumer", "state commission", "national commission", "consumer forum", "consumer disputes", "before the hon"],
  complainant_details:  ["complainant", "petitioner", "applicant", "i,", "the complainant", "name of complainant"],
  respondent_details:   ["respondent", "opposite party", "op no.", "o.p.", "against"],
  relief_sought:        ["relief", "prayer", "prayed", "compensation", "refund", "direction", "it is prayed", "relief sought"],

  // Cheque bounce fields (W4)
  cheque_details:  ["cheque no.", "cheque number", "dated cheque", "cheque bearing", "drawn on", "dishonoured", "returned unpaid"],
  demand_amount:   ["demand", "amount of rs.", "sum of rs.", "pay rs.", "demanded amount", "total amount"],
  "15_day_notice": ["15 days", "fifteen days", "within 15", "notice period", "30 days", "thirty days", "section 138"],
};

/**
 * Checks if a specific section key is present in the draft text.
 */
function isSectionPresent(sectionKey: string, text: string): boolean {
  const lowerText = text.toLowerCase();

  // 1. Direct match for header or label (e.g. "### Subject" or "**Subject**" or "Subject:")
  const cleanKey = sectionKey.replace(/_/g, " ").trim().toLowerCase();
  const directHeaderRegex = new RegExp(
    `(#+|\\*\\*|__)\\s*${cleanKey.replace(/[+]/g, "\\+")}\\s*(#+|\\*\\*|__)?`,
    "i",
  );
  const directLabelRegex = new RegExp(
    `^\\s*${cleanKey.replace(/[+]/g, "\\+")}\\s*:`,
    "mi",
  );

  if (directHeaderRegex.test(text) || directLabelRegex.test(text)) {
    return true;
  }

  // 2. Keyword/phrase fallback
  const keywords = SECTION_KEYWORDS[sectionKey] || [cleanKey];
  return keywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Evaluates the structural completeness of a draft document in a fixture.
 * Completeness Rate = (present_sections / required_sections) * 100
 */
export async function completeness(
  fixture: Fixture,
): Promise<CompletenessResult> {
  const text = fixture.draft_output.text;

  // W4: fixture-specific ground_truth takes priority; DOC_TYPE map is the fallback.
  // This preserves curated required_sections (e.g. W3 RTI fixtures with custom fields)
  // while still providing defaults for new fixtures that don't set ground_truth.
  let requiredSections =
    (fixture.ground_truth.required_sections?.length
      ? fixture.ground_truth.required_sections
      : undefined) ??
    DOC_TYPE_REQUIRED_SECTIONS[fixture.doc_type] ??
    [];

  // Final fallback: if still empty, use RTI defaults
  if (requiredSections.length === 0) {
    requiredSections = ["pio_address", "subject", "info_sought", "declaration", "date_signature"];
  }

  const missingSections: string[] = [];

  for (const section of requiredSections) {
    if (!isSectionPresent(section, text)) {
      missingSections.push(section);
    }
  }

  const totalRequired = requiredSections.length;
  const presentRequired = totalRequired - missingSections.length;
  const rate = totalRequired === 0 ? 100 : (presentRequired / totalRequired) * 100;

  return {
    metric: "completeness",
    required_sections: requiredSections,
    missing_sections: missingSections,
    completeness_rate: rate,
    completeness_score: rate,
    eval_metric: {
      name: "completeness_rate",
      value: rate,
      unit: "percent",
    },
    status: rate === 100 ? "pass" : "fail",
  };
}
