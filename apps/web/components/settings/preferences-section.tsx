"use client";

import React, { useState } from "react";
import type { User, SupportedLanguage } from "@trionic/shared";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionFrame, fieldLabel, fieldHint } from "./section-frame";

interface PreferencesSectionProps {
  initialUser: User;
  onUpdateUser: (updatedUser: Partial<User>) => void;
}

const LANGUAGES: { value: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { value: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { value: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
];

export function PreferencesSection({ initialUser, onUpdateUser }: PreferencesSectionProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(initialUser.default_language || "en");
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    productUpdates: false,
    securityAlerts: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ default_language: language }),
      });

      if (!res.ok) {
        throw new Error("Failed to save preferences");
      }

      const updatedUser = (await res.json()) as User;
      onUpdateUser(updatedUser);

      toast({
        title: "Preferences Saved",
        description: "Your language and notification settings have been updated.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Save Failed",
        description: "Something went wrong while saving your preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const NOTIFICATIONS = [
    { key: "emailNotifications", title: "Email notifications", hint: "Receive critical account alerts via email." },
    { key: "productUpdates", title: "Product updates", hint: "Get notified when new features or draft templates launch." },
    { key: "securityAlerts", title: "Security alerts", hint: "Immediate warnings about login events and password changes." },
  ] as const;

  return (
    <SectionFrame index="02" title="Preferences" description="Manage localization options and system notifications.">
      <form onSubmit={handleSave} className="space-y-10">
        <fieldset className="space-y-3">
          <legend className={`${fieldLabel} mb-3`}>Default language</legend>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-5">
            {LANGUAGES.map((lang) => {
              const selected = language === lang.value;
              return (
                <label
                  key={lang.value}
                  className={`flex cursor-pointer flex-col gap-1 border-l-[3px] bg-background px-4 py-3.5 transition-colors duration-[180ms] has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:-outline-offset-1 has-[:focus-visible]:outline-ring ${
                    selected ? "border-brand bg-accent" : "border-transparent hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="defaultLanguage"
                    value={lang.value}
                    checked={selected}
                    onChange={() => setLanguage(lang.value as SupportedLanguage)}
                    disabled={isSaving}
                    className="sr-only"
                  />
                  <span className="font-serif text-[19px] leading-tight">{lang.nativeLabel}</span>
                  <span className="label-caps text-[9px] text-subtle-foreground">{lang.label}</span>
                </label>
              );
            })}
          </div>
          <p className={fieldHint}>
            Changing this updates the default language for generated documents. Supported Indic scripts are styled for maximum readability.
          </p>
        </fieldset>

        <div>
          <p className={`${fieldLabel} mb-3`}>Notifications</p>
          <ul className="border-t border-border">
            {NOTIFICATIONS.map(({ key, title, hint }) => {
              const on = notifications[key];
              return (
                <li key={key} className="flex items-center justify-between gap-6 border-b border-hairline-soft py-4">
                  <div>
                    <p className="font-serif text-[18px] leading-tight">{title}</p>
                    <p className={fieldHint}>{hint}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={title}
                    onClick={() => toggleNotification(key)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer border transition-colors duration-[180ms] ${
                      on ? "border-brand bg-brand" : "border-border bg-transparent hover:border-foreground/40"
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] size-4 transition-[left,background-color] duration-200 ease-editorial ${
                        on ? "left-[22px] bg-white" : "left-[3px] bg-subtle-foreground"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save strokeWidth={1.25} />}
            {isSaving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </form>
    </SectionFrame>
  );
}
