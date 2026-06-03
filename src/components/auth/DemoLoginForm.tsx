'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function DemoLoginForm() {
  const [email, setEmail] = useState('demo@drpet.com')
  const [password, setPassword] = useState('demo1234')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/',
      redirect: false,
    })

    if (result?.error) {
      setError('帳號或密碼錯誤，請再試一次')
      setLoading(false)
    } else if (result?.url) {
      window.location.href = result.url
    }
  }

  return (
    <div className="mt-5">
      {/* 分隔線 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-black/10" />
        <span className="text-xs font-medium text-slate-400">或</span>
        <div className="flex-1 h-px bg-black/10" />
      </div>

      <p className="text-xs text-slate-400 text-center mb-3">開發測試帳號</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          required
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 transition-colors"
        />

        {error && (
          <p className="text-xs text-red-500 font-medium text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border-2 border-black/15 bg-transparent px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-black/30 hover:text-slate-800 transition-colors disabled:opacity-50"
        >
          {loading ? '登入中…' : '以測試帳號登入'}
        </button>
      </form>
    </div>
  )
}
