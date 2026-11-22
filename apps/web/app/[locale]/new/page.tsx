'use client'

import React, { useState } from 'react'
import type { DocumentType, SupportedLanguage } from '@trionic/shared'
import { LanguagePicker } from '@/components/intake/LanguagePicker'
import { StreamingIndicator } from '@/components/intake/StreamingIndicator'
import { AppHeader } from '@/components/brand/app-header'
import { ArrowIcon, BracketLabel, SectionHeading, splitAccent } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export default function NewDraftPage() {
  const t = useTranslations('intake')
  const tCommon = useTranslations('common')

  const [docType, setDocType] = useState<DocumentType | 'ai_decide'>('ai_decide')
  const [intakeText, setIntakeText] = useState('')
  const [language, setLanguage] = useState<SupportedLanguage>('en')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // SSE streaming lifecycle trigger states
  const [isStreaming, setIsStreaming] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)

  const DOC_TYPES = [
    {
      value: 'ai_decide',
      label: t('docTypeOptionAi'),
      description: t('docTypeOptionAiDesc'),
    },
    {
      value: 'rti_application',
      label: t('docTypeOptionRti'),
      description: t('docTypeOptionRtiDesc'),
    },
    {
      value: 'legal_notice',
      label: t('docTypeOptionNotice'),
      description: t('docTypeOptionNoticeDesc'),
    },
    {
      value: 'nda',
      label: t('docTypeOptionNda'),
      description: t('docTypeOptionNdaDesc'),
    },
    {
      value: 'consumer_complaint',
      label: t('docTypeOptionConsumer'),
      description: t('docTypeOptionConsumerDesc'),
    },
    {
      value: 'cheque_bounce_notice',
      label: t('docTypeOptionCheque'),
      description: t('docTypeOptionChequeDesc'),
    },
  ] as const

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!intakeText.trim()) {
      setError(t('situationPlaceholder'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_type: docType === 'ai_decide' ? undefined : docType,
          language,
          intake_text: intakeText,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to initialize document draft.')
      }

      const { document_id } = await response.json()
      setDocumentId(document_id)
      setIsStreaming(true)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      setError(message)
      setLoading(false)
    }
  }

  function handleCancelStream() {
    setIsStreaming(false)
    setLoading(false)
    setDocumentId(null)
  }

  if (isStreaming && documentId) {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center px-4 py-16">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(50%_45%_at_50%_40%,rgba(5,95,89,0.35),transparent_70%)]"
        />
        <StreamingIndicator
          documentId={documentId}
          intakeText={intakeText}
          targetLanguage={language}
          docType={docType === 'ai_decide' ? undefined : docType}
          onCancel={handleCancelStream}
        />
      </div>
    )
  }

  const [titleLead, titleAccent] = splitAccent(t('title'))

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-10 md:py-16">
        <SectionHeading label={tCommon('brandName')} title={titleLead} accent={titleAccent} subtitle={t('situationPlaceholder')} />

        <form onSubmit={handleSubmit} className="mt-12 border-t border-border">
          {/* 01 — Document type */}
          <section className="grid gap-6 border-b border-border py-10 lg:grid-cols-[300px_1fr] lg:gap-12">
            <div className="space-y-2">
              <span className="label-caps text-brand-soft">01</span>
              <h2 className="text-[26px] leading-tight">{t('docTypeQuestion')}</h2>
            </div>
            <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
              {DOC_TYPES.map((type) => {
                const isSelected = docType === type.value
                return (
                  <label
                    key={type.value}
                    className={`flex cursor-pointer flex-col gap-1.5 border-l-[3px] bg-background px-5 py-4 transition-colors duration-[180ms] has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:-outline-offset-1 has-[:focus-visible]:outline-ring ${
                      isSelected ? 'border-brand bg-accent' : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="docType"
                      value={type.value}
                      checked={isSelected}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onChange={() => setDocType(type.value as any as DocumentType)}
                      className="sr-only"
                    />
                    <span className={`font-serif text-[19px] leading-tight ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>
                      {type.label}
                    </span>
                    <span className="text-[13px] leading-relaxed text-muted-foreground">{type.description}</span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* 02 — Situation, written on paper */}
          <section className="grid gap-6 border-b border-border py-10 lg:grid-cols-[300px_1fr] lg:gap-12">
            <div className="space-y-2">
              <span className="label-caps text-brand-soft">02</span>
              <h2 className="text-[26px] leading-tight">
                <label htmlFor="intake-text">{t('situationQuestion')}</label>
              </h2>
            </div>
            <div className="paper border border-border bg-background p-1">
              <textarea
                id="intake-text"
                rows={8}
                value={intakeText}
                onChange={(e) => setIntakeText(e.target.value)}
                className="block w-full resize-y bg-transparent px-6 py-5 font-serif text-[19px] leading-[1.6] text-foreground outline-none placeholder:text-subtle-foreground focus-visible:outline-none"
                placeholder={t('situationPlaceholder')}
              />
            </div>
          </section>

          {/* 03 — Language */}
          <section className="grid gap-6 border-b border-border py-10 lg:grid-cols-[300px_1fr] lg:gap-12">
            <span className="label-caps text-brand-soft">03</span>
            <LanguagePicker value={language} onChange={setLanguage} />
          </section>

          {error && (
            <p role="alert" className="mt-8 border-l-2 border-destructive pl-3 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse items-start gap-6 py-10 md:flex-row md:items-center md:justify-between">
            <BracketLabel className="normal-case tracking-[0.04em]">{tCommon('disclaimer')}</BracketLabel>
            <Button
              type="submit"
              size="lg"
              disabled={loading || !intakeText.trim()}
              className="w-full justify-between md:w-[320px]"
              id="btn-generate-draft"
            >
              {loading ? t('loading') : t('submitButton')}
              <ArrowIcon />
            </Button>
          </div>
        </form>
      </main>
    </>
  )
}
