"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Globe, Check, ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en", nativeLabel: "English" },
  { code: "hi", nativeLabel: "हिन्दी" },
  { code: "gu", nativeLabel: "ગુજરાતી" },
  { code: "mr", nativeLabel: "मराठी" },
  { code: "ta", nativeLabel: "தமிழ்" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    // Router transition preserving current path structure
    router.replace(pathname, { locale: newLocale });
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        role="button"
        aria-haspopup="listbox"
        aria-label="Select Language"
        className="flex h-9 cursor-pointer items-center gap-2 border border-border bg-transparent px-3 text-[13px] text-muted-foreground transition-colors duration-[180ms] select-none hover:border-foreground/40 hover:text-foreground"
      >
        <Globe strokeWidth={1.25} className="size-3.5" />
        <span className="font-sans leading-none">{currentLanguage.nativeLabel}</span>
        <ChevronDown strokeWidth={1.25} className="size-3" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          role="listbox"
          align="end"
          sideOffset={5}
          className="z-50 min-w-[10rem] animate-in overflow-hidden border border-border bg-popover py-1 text-popover-foreground shadow-[0_32px_64px_rgba(0,0,0,0.55)] fade-in-80"
        >
          {LANGUAGES.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              role="option"
              aria-selected={lang.code === locale}
              onClick={() => handleLanguageChange(lang.code)}
              className="relative flex w-full cursor-pointer items-center border-l-2 border-transparent py-2 pr-3 pl-8 text-sm outline-none select-none transition-colors duration-[180ms] focus:border-brand focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              {lang.code === locale && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check strokeWidth={1.5} className="size-3.5 text-brand-soft" />
                </span>
              )}
              {lang.nativeLabel}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}