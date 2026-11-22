import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import "@/app/globals.css";

// Self-hosted (woff2 from Google Fonts) so builds never depend on
// fonts.googleapis.com — a bad response from it failed a Vercel build.
// Latin: Instrument Serif (display), Inter (UI), JetBrains Mono (ids/code).
// Indic: Noto Sans for body, Noto Serif for headings; not preloaded, so only
// pages that render those scripts download them.
const inter = localFont({
  src: "../fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
});

const instrument = localFont({
  src: [
    { path: "../fonts/InstrumentSerif-Regular.woff2", style: "normal", weight: "400" },
    { path: "../fonts/InstrumentSerif-Italic.woff2", style: "italic", weight: "400" },
  ],
  variable: "--font-instrument",
});

const jetbrains = localFont({
  src: "../fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  preload: false,
});

const devanagari = localFont({ src: "../fonts/NotoSansDevanagari-Variable.woff2", variable: "--font-devanagari", weight: "300 700", display: "swap", preload: false });
const gujarati = localFont({ src: "../fonts/NotoSansGujarati-Variable.woff2", variable: "--font-gujarati", weight: "300 700", display: "swap", preload: false });
const tamil = localFont({ src: "../fonts/NotoSansTamil-Variable.woff2", variable: "--font-tamil", weight: "300 700", display: "swap", preload: false });
const serifDevanagari = localFont({ src: "../fonts/NotoSerifDevanagari-Variable.woff2", variable: "--font-serif-devanagari", weight: "100 900", display: "swap", preload: false });
const serifGujarati = localFont({ src: "../fonts/NotoSerifGujarati-Variable.woff2", variable: "--font-serif-gujarati", weight: "100 900", display: "swap", preload: false });
const serifTamil = localFont({ src: "../fonts/NotoSerifTamil-Variable.woff2", variable: "--font-serif-tamil", weight: "100 900", display: "swap", preload: false });

// Every variable on <html>: the font stacks in globals.css reference all of
// them, and one undefined var() invalidates the whole font-family (falls back to serif).
const fontVariables = [inter, instrument, jetbrains, devanagari, gujarati, tamil, serifDevanagari, serifGujarati, serifTamil]
  .map((f) => f.variable)
  .join(" ");

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "Trionic Adalat",
  description: "AI legal drafting platform",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming locale is supported
  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  // Fetch translation messages
  const messages = await getMessages();
  const isRtl = locale === "ur";
  const dir = isRtl ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans relative">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

