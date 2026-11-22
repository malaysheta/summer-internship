'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { useLocale, useTranslations } from 'next-intl'
import { AuthShell, authInputClass } from '@/components/brand/auth-shell'
import { ArrowIcon, BracketLabel } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('auth')
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Confirmation link returns to whichever deployment the user signed up on
        // (must also be allowed under Supabase → Auth → URL Configuration).
        options: { emailRedirectTo: `${window.location.origin}/${locale}/auth/sign-in` },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      
      // If email confirmation is required, session will be null
      if (!data.session) {
        setError("Please check your email to confirm your account before continuing.")
        setLoading(false)
        return
      }
      
      router.push('/onboarding')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      // Check if onboarding is complete
      const { data: userData } = await supabase
        .from('users')
        .select('onboarded_at')
        .eq('id', data.user.id)
        .single()

      if (!userData?.onboarded_at) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
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
          <BracketLabel>{isSignUp ? t('signUp') : t('signInButton')}</BracketLabel>
          <h1 className="text-[clamp(34px,3.4vw,48px)] leading-[1.05] tracking-[-0.02em]">
            {isSignUp ? t('createAccountTitle') : t('signInTitle')}
          </h1>
        </header>

        <div className="space-y-7">
          <label className="block space-y-1">
            <span className="label-caps text-muted-foreground">{t('emailLabel')}</span>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="you@example.com"
            />
          </label>
          <label className="block space-y-1">
            <span className="label-caps text-muted-foreground">{t('passwordLabel')}</span>
            <Input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              placeholder="••••••••"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-destructive pl-3 text-[13px] text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <Button type="submit" size="lg" disabled={loading} className="w-full justify-between">
            {loading ? t('pleaseWait') : isSignUp ? t('signUpButton') : t('signInButton')}
            <ArrowIcon />
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            className="w-full justify-center"
          >
            {isSignUp ? t('alreadyHaveAccount') : t('createAccount')}
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
