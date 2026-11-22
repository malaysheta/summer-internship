'use client'

import React from 'react'
import type { SupportedLanguage } from '@trionic/shared'

const LANGUAGES: { value: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { value: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { value: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { value: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
]

interface LanguagePickerProps {
  value: SupportedLanguage
  onChange: (value: SupportedLanguage) => void
}

import { useTranslations } from 'next-intl'

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const t = useTranslations('intake')

  return (
    <div className="space-y-6">
      <h2 className="text-[26px] leading-tight">{t('languageQuestion')}</h2>
      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-5">
        {LANGUAGES.map((lang) => {
          const isSelected = value === lang.value
          return (
            <button
              key={lang.value}
              type="button"
              onClick={() => onChange(lang.value)}
              className={`flex flex-col items-start gap-1 border-l-[3px] bg-background px-4 py-4 text-left transition-colors duration-[180ms] focus-visible:-outline-offset-1 ${
                isSelected ? 'border-brand bg-accent text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              id={`lang-picker-${lang.value}`}
              aria-pressed={isSelected}
            >
              <span className="font-serif text-[20px] leading-tight">{lang.nativeLabel}</span>
              <span className="label-caps text-[10px] text-subtle-foreground">{lang.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
