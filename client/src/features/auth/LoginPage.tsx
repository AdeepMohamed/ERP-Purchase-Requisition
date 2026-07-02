import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    // Client-side validation — server also validates (§6)
    if (!email.trim()) { setError('Email is required'); return }
    if (!password) { setError('Password is required'); return }

    setIsLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      {/* Background glow effect */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-primary-600/5 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-sm">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white text-2xl font-bold shadow-lg shadow-primary-600/25">
              P
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">ProcureFlow</h1>
              <p className="mt-1 text-sm text-neutral-400">Sign in to your account</p>
            </div>
          </div>

          <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Error alert */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-600/30 bg-danger-600/10 px-4 py-3 text-sm text-danger-400"
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-neutral-300">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@erpdemo.local"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-neutral-300">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Demo credentials
            </p>
            <div className="space-y-1 text-xs text-neutral-400 font-mono">
              <p>alice@erpdemo.local — employee</p>
              <p>bob@erpdemo.local — manager</p>
              <p>dave@erpdemo.local — admin</p>
              <p className="text-neutral-600">password: demo1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
