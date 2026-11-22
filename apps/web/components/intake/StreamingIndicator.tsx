'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from '@/i18n/routing'
import type { AgentStreamEvent, SupportedLanguage } from '@trionic/shared'
import { createClient } from '@/lib/supabase/client'
import { Check, X } from 'lucide-react'
import { BracketLabel, Spark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface StreamingIndicatorProps {
  documentId: string
  intakeText: string
  targetLanguage: SupportedLanguage
  docType?: string
  onCancel: () => void
}

interface StepItem {
  id: string
  agent: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

export function StreamingIndicator({
  documentId,
  intakeText,
  targetLanguage,
  docType,
  onCancel,
}: StreamingIndicatorProps) {
  const router = useRouter()
  const t = useTranslations('draft')
  const supabase = createClient()
  const streamStarted = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [steps, setSteps] = useState<StepItem[]>([
    { id: '1', agent: 'classifier', label: 'Classifying your issue', status: 'pending' },
    { id: '2', agent: 'planner', label: 'Identifying applicable Acts', status: 'pending' },
    { id: '3', agent: 'pageindex', label: 'Retrieving legal sections', status: 'pending' },
    { id: '4', agent: 'drafter', label: 'Drafting', status: 'pending' },
    { id: '5', agent: 'citator', label: 'Verifying citations', status: 'pending' },
    { id: '6', agent: 'reviewer', label: 'Final review', status: 'pending' },
  ])

  const [statusMessage, setStatusMessage] = useState(t('steps.usuallyTakes'))
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Dynamically add translation step if needed
  useEffect(() => {
    if (targetLanguage !== 'en') {
      setSteps((prev) => {
        if (prev.some((s) => s.agent === 'translator')) return prev
        return [
          ...prev,
          { id: '7', agent: 'translator', label: 'Translating draft', status: 'pending' },
        ]
      })
    }
  }, [targetLanguage])

  useEffect(() => {
    if (streamStarted.current) return
    streamStarted.current = true

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    async function startStream() {
      try {
        const response = await fetch('/api/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: documentId,
            intake_text: intakeText,
            target_language: targetLanguage,
            doc_type: docType || undefined,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Server error: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Readable stream not supported by browser/server response')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6)
              try {
                const event = JSON.parse(jsonStr) as AgentStreamEvent
                handleEvent(event)
              } catch (err) {
                console.error('Failed to parse SSE event:', err)
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted by client')
          return
        }
        // Surface real errors to the user. The previous code silently fell
        // back to a hardcoded mock pipeline with green checkmarks, then
        // navigated to a blank /draft/{id} — making failures look like
        // successes to the audience during demo.
        console.error('SSE connection failed:', err.message || err)
        setIsError(true)
        setErrorMessage(
          err?.message || 'Could not reach the draft service. Please try again.'
        )
        setStatusMessage('Generation failed')
        setSteps((prev) =>
          prev.map((step) =>
            step.status === 'pending' || step.status === 'running'
              ? { ...step, status: 'error' as const }
              : step
          )
        )
      }
    }

    startStream()

    return () => {
      // Clean up connection on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Reset for React 18 StrictMode so it restarts correctly on remount
      streamStarted.current = false
    }
  }, [documentId, intakeText, targetLanguage, docType])

  function handleEvent(event: AgentStreamEvent) {
    if (event.type === 'step.start') {
      setSteps((prev) =>
        prev.map((step) =>
          step.agent === event.agent ? { ...step, status: 'running' } : step
        )
      )
    } else if (event.type === 'step.done') {
      setSteps((prev) =>
        prev.map((step) =>
          step.agent === event.agent ? { ...step, status: 'done' } : step
        )
      )
    } else if (event.type === 'step.error') {
      setSteps((prev) =>
        prev.map((step) =>
          step.agent === event.agent ? { ...step, status: 'error' } : step
        )
      )
      setIsError(true)
      setErrorMessage(event.message || `Error in ${event.agent} agent`)
      setStatusMessage('Generation failed')
    } else if (event.type === 'draft.final') {
      // Automatically redirect to draft/[id] editor
      router.push(`/draft/${documentId}`)
    }
  }

  async function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    try {
      // Update status to 'failed' using RLS policy permissions
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId)
    } catch (err) {
      console.error('Failed to update document status to failed:', err)
    }

    onCancel()
  }

  const doneCount = steps.filter((step) => step.status === 'done').length

  return (
    <div className="relative w-full max-w-xl border border-border bg-card">
      {/* Progress: share of finished steps */}
      <div className="h-0.5 w-full bg-hairline-soft">
        <div
          className={`h-full transition-[width] duration-700 ease-editorial ${isError ? 'bg-destructive' : 'bg-brand'}`}
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3 border-b border-border px-8 pt-10 pb-8">
        <div className="flex items-center gap-3">
          <Spark className={isError ? 'text-destructive' : 'animate-[spin_6s_linear_infinite]'} />
          <BracketLabel>{t('title')}</BracketLabel>
        </div>
        <h2 className="text-[clamp(28px,3vw,38px)] leading-[1.1] tracking-[-0.01em]">
          {isError ? t('steps.generationInterrupted') : t('generating')}
        </h2>
        <p className={`text-[13px] ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>{statusMessage}</p>
      </div>

      <ol>
        {steps.map((step, i) => (
          <li
            key={step.id}
            className={`grid grid-cols-[56px_1fr_28px] items-center border-b border-l-[3px] border-b-hairline-soft px-8 py-4 transition-colors duration-[180ms] ${
              step.status === 'running' ? 'border-l-brand bg-accent' : step.status === 'error' ? 'border-l-destructive' : 'border-l-transparent'
            }`}
          >
            <span className="label-caps text-[10px] text-subtle-foreground">{String(i + 1).padStart(2, '0')}</span>
            <span
              className={`font-serif text-[19px] leading-tight transition-colors duration-[180ms] ${
                step.status === 'running'
                  ? 'text-foreground'
                  : step.status === 'done'
                  ? 'text-muted-foreground'
                  : step.status === 'error'
                  ? 'text-destructive'
                  : 'text-subtle-foreground'
              }`}
            >
              {t(`steps.${step.agent}`)}
            </span>
            <span className="flex justify-end">
              {step.status === 'running' && <span className="size-2 animate-pulse rounded-full bg-brand" />}
              {step.status === 'done' && <Check strokeWidth={1.25} className="size-4 text-success" />}
              {step.status === 'error' && <X strokeWidth={1.25} className="size-4 text-destructive" />}
              {step.status === 'pending' && <span className="h-px w-3 bg-subtle-foreground/60" />}
            </span>
          </li>
        ))}
      </ol>

      {isError && errorMessage && (
        <p className="mx-8 mt-6 border-l-2 border-destructive pl-3 text-[13px] leading-relaxed whitespace-pre-wrap text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end px-8 py-6">
        <Button variant={isError ? 'outline' : 'ghost'} onClick={handleCancel}>
          {isError ? t('steps.goBack') : t('steps.cancelGeneration')}
        </Button>
      </div>
    </div>
  )
}
