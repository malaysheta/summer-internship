/**
 * Canonical required sections per document type — the ONE list shared by the
 * Drafter (asks for these `## ` headings), the Reviewer (checks for them), the
 * editor (lib/document-templates.ts) and the document_templates seed (0005).
 *
 * The Reviewer used to keep its own list ("Drawer Details", "Payee Details",
 * …) while the Drafter wrote "## Drawer", "## Drawee", … so every non-RTI
 * draft was rejected with "Missing required sections". Change names here only.
 */
import type { DocumentType } from "./types.js";

export const REQUIRED_SECTIONS: Record<DocumentType, string[]> = {
  rti_application: ["Address", "Subject", "Information Sought", "Declaration"],
  legal_notice: ["Sender", "Recipient", "Cause", "Demand", "Deadline"],
  nda: ["Parties", "Purpose", "Confidential Info", "Term", "Remedies"],
  consumer_complaint: ["Complainant", "Opposite Party", "Goods/Service", "Deficiency", "Relief"],
  cheque_bounce_notice: ["Drawer", "Drawee", "Cheque Details", "Section 138 Invocation", "Demand"],
};
