'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import type { SupportedLanguage } from '@trionic/shared'
import { useTranslations } from 'next-intl'
import { AuthShell, authInputClass } from '@/components/brand/auth-shell'
import { ArrowIcon, BracketLabel } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const LANGUAGES: { value: SupportedLanguage }[] = [
  { value: 'en' },
  { value: 'hi' },
  { value: 'gu' },
  { value: 'mr' },
  { value: 'ta' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const tLanguages = useTranslations('languages')

  const [displayName, setDisplayName] = useState('')
  const [language, setLanguage] = useState<SupportedLanguage>('en')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!displayName.trim()) {
      setError(t('errorEmptyName'))
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        default_language: language,
        onboarded: true,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.message || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <AuthShell>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-10"
      >
        <header className="space-y-3">
          <BracketLabel>{tCommon('brandName')}</BracketLabel>
          <h1 className="text-[clamp(34px,3.4vw,48px)] leading-[1.05] tracking-[-0.02em]">{t('welcome')}</h1>
          <p className="text-[14px] leading-relaxed text-muted-foreground">{t('subtitle')}</p>
        </header>

        <label className="block space-y-1">
          <span className="label-caps text-muted-foreground">{t('displayName')}</span>
          <Input
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={authInputClass}
            placeholder={t('displayNamePlaceholder')}
          />
        </label>

        <fieldset className="space-y-3">
          <legend className="label-caps mb-3 text-muted-foreground">{t('preferredLanguage')}</legend>
          {/* Radios, not buttons: e2e submits via the first button inside <main>. */}
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
            {LANGUAGES.map((lang) => (
              <label
                key={lang.value}
                className={`relative flex cursor-pointer items-center border-l-[3px] px-4 py-3.5 text-[15px] transition-colors duration-[180ms] select-none has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-ring ${
                  language === lang.value ? 'border-brand bg-accent text-foreground' : 'border-transparent bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={lang.value}
                  checked={language === lang.value}
                  onChange={() => setLanguage(lang.value)}
                  className="sr-only"
                />
                {tLanguages(lang.value)}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="border-l-2 border-destructive pl-3 text-[13px] text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full justify-between">
          {loading ? t('saving') : t('continue').replace(/\s*→$/, '')}
          <ArrowIcon />
        </Button>
      </form>
    </AuthShell>
  )
}
