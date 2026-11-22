import React from "react";
import { Metadata } from "next";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { AppHeader } from "@/components/brand/app-header";
import { SectionHeading } from "@/components/brand";

export const metadata: Metadata = {
  title: "Settings — Trionic AI Adalat",
  description: "Manage your profile, preferences, and account security options.",
};

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-12 md:px-10 md:py-16">
        <SectionHeading
          label="Settings"
          title="System"
          accent="settings"
          subtitle="Configure profile details, regional preferences, and security access."
        />

        <div className="mt-10 flex flex-col gap-8 border-t border-border pt-8 md:flex-row md:gap-12">
          <SettingsSidebar />
          <main className="min-w-0 flex-1">
            <div className="animate-in duration-200 fade-in slide-in-from-bottom-1">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
