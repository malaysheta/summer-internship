import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { LanguageSwitcher } from "@/components/language-switcher";
import "@/app/globals.css";

// Self-hosted (variable woff2 from Google Fonts) so builds never depend on
// fonts.googleapis.com — a bad response from it failed a Vercel build.
const geistSans = localFont({
  src: "../fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const devanagari = localFont({
  src: "../fonts/NotoSansDevanagari-Variable.woff2",
  variable: "--font-devanagari",
  weight: "300 700",
  display: "swap",
});

const gujarati = localFont({
  src: "../fonts/NotoSansGujarati-Variable.woff2",
  variable: "--font-gujarati",
  weight: "300 700",
  display: "swap",
});

const tamil = localFont({
  src: "../fonts/NotoSansTamil-Variable.woff2",
  variable: "--font-tamil",
  weight: "300 700",
  display: "swap",
});

const fontMap: Record<string, string> = {
  en: geistSans.variable,
  hi: devanagari.variable,
  mr: devanagari.variable, // Marathi shares Devanagari font structures
  gu: gujarati.variable,
  ta: tamil.variable,
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
  const fontVariable = fontMap[locale] || geistSans.variable;
  const isRtl = locale === "ur";
  const dir = isRtl ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontVariable} h-full antialiased`}
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

