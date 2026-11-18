import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Document, Packer } from "docx";
import type { DocumentType, ExportFormat, ExportResult, SupportedLanguage } from "@trionic/shared";

import { getTemplate } from "@/lib/export/templates";
import { pdfFooter } from "@/lib/export/templates/rti.tpl";
import { get_text } from "@trionic/pageindex";

// PDF rendering launches Chromium; give it room on cold starts.
export const maxDuration = 60;

type Citation = {
  id: string;
  ref?: string;
  text: string;
};

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Cookie session via the shared factory (postmortem #337). The editor never
    // sent an Authorization header, so the old anon client always hit RLS → 403.
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const documentId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") as ExportFormat;
    const includeAppendix = searchParams.get("include_appendix") !== "false";

    if (format !== "pdf" && format !== "docx") {
      return NextResponse.json({ error: "Unsupported format. Use pdf or docx." }, { status: 400 });
    }

    const { data: documentRow, error: documentError } = await supabase
      .from("documents")
      .select("id, doc_type, language, title")
      .eq("id", documentId)
      .single();

    if (documentError || !documentRow) {
      console.error("[Export API] Document metadata fetch failed:", documentError);
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 403 });
    }

    const { data: docVersion, error: docError } = await supabase
      .from("document_versions")
      .select("id, body_markdown")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (docError || !docVersion) {
      console.error("[Export API] DB Fetch Error or Unauthorized:", docError);
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 403 });
    }

    let rawMarkdown = docVersion.body_markdown;
    const citations: Citation[] = [];
    // Node ids contain "/" (e.g. RTI-2005/CH-II/S-6) — same regex as drafter/citations.ts
    const citeRegex = /\[CITE:([^\]]+)\]/g;
    const matches = [...rawMarkdown.matchAll(citeRegex)];
    const nodeIds = [...new Set(matches.map((match) => match[1]))];

    if (nodeIds.length > 0 && includeAppendix) {
      // Resolve through PageIndex (same resolver the Citator validated with) so
      // the appendix shows "Act › Section n › Title". Markers stay in the
      // markdown; the template numbers them as superscripts in this order.
      for (const id of nodeIds) {
        const node = await get_text(id).catch(() => null);
        citations.push({
          id,
          ref: node?.node_id ?? id,
          text: node
            ? [node.act_name, node.number && `Section ${node.number}`, node.title?.replace(/\.$/, "")].filter(Boolean).join(" › ")
            : id,
        });
      }
    } else {
      rawMarkdown = rawMarkdown.replace(citeRegex, "");
    }

    const docType = normalizeDocType(documentRow.doc_type, documentRow.title);
    const language = normalizeLanguage(documentRow.language);
    const template = getTemplate(docType);
    const docData = {
      templateHtml: template.buildHtml(rawMarkdown, citations, { language, includeAppendix }),
      templateDocx: template.buildDocx(rawMarkdown, citations, { language, includeAppendix }),
      language,
    };

    const fileBuffer = format === "pdf" ? await buildPdf(docData) : await buildDocx(docData);

    const timestamp = new Date()
      .toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/[\/\s:,]/g, "-");
    const fileName = `export_${timestamp}.${format}`;
    const filePath = `${documentId}/${fileName}`;

    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(filePath, fileBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("[Export API] Storage Upload Error:", uploadError);
      throw uploadError;
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from("exports")
      .createSignedUrl(filePath, 300);

    if (urlError || !urlData) {
      console.error("[Export API] Signed URL Error:", urlError);
      throw urlError;
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      format,
      expires_at: new Date(Date.now() + 300_000).toISOString(),
    } satisfies ExportResult);
  } catch (err) {
    console.error("[Export Route] Critical crash during file generation:", err);
    return NextResponse.json({ error: "Failed to export document" }, { status: 500 });
  }
}

// Week 4 export template update

function normalizeDocType(docType?: string, title?: string): DocumentType {
  const normalized = (docType ?? "").toLowerCase().trim();

  if (
    normalized === "rti_application" ||
    normalized === "rti" ||
    normalized === "petition"
  ) {
    return "rti_application";
  }

  if (
    normalized === "legal_notice" ||
    normalized === "notice"
  ) {
    return /cheque/i.test(title || "") ? "cheque_bounce_notice" : "legal_notice";
  }

  if (normalized === "nda" || normalized === "agreement") {
    return "nda";
  }

  if (normalized === "consumer_complaint" || normalized === "complaint") {
    return "consumer_complaint";
  }

  if (
    normalized === "cheque_bounce_notice" ||
    normalized === "cheque_bounce" ||
    normalized === "cheque"
  ) {
    return "cheque_bounce_notice";
  }

  return "rti_application";
}

function normalizeLanguage(language?: string): SupportedLanguage {
  if (language === "en" || language === "hi" || language === "gu" || language === "mr" || language === "ta") {
    return language;
  }

  return "en";
}

// Vercel functions have no system Chrome: use the serverless Chromium build there,
// and the full puppeteer download locally.
async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = (await import("puppeteer-core")).default;
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function buildPdf(doc: { templateHtml: string; language: SupportedLanguage }): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(doc.templateHtml, { waitUntil: "load" });
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: pdfFooter(doc.language),
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

async function buildDocx(doc: { templateDocx: Document }): Promise<Buffer> {
  return await Packer.toBuffer(doc.templateDocx);
}
