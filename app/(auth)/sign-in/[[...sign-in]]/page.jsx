"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { getAuthenticatedRequestHeaders, normalizeRole } from '@/lib/permissions'


export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async (event) => {
    event.preventDefault()
    if (!email || !password) {
      toast('Please enter your email and password')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        toast(error.message || 'Unable to sign in. Please check your credentials.')
        setLoading(false)
        return
      }

      const storedRole = typeof window !== 'undefined' ? localStorage.getItem('preferred_role') : null
      const userRole = normalizeRole(data?.user?.user_metadata?.role ?? storedRole ?? 'student')

      if (data?.user) {
        await supabase.auth.updateUser({ data: { role: userRole } })
        const headers = await getAuthenticatedRequestHeaders(userRole)
        await fetch('/api/profiles', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: data.user.id, email: data.user.email, role: userRole }),
        })
      }

      try {
        localStorage.removeItem('preferred_role')
      } catch (e) {
        console.error('Failed to clear preferred role', e)
      }

      toast('Signed in successfully')
      router.push('/')
    } catch (e) {
      console.error('sign-in error', e)
      toast('Unable to sign in right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg shadow-slate-200">
        <h1 className="text-3xl font-semibold text-slate-900">Sign in to Squid</h1>
        <p className="mt-2 text-sm text-slate-500">Use your email and password to continue as a student, agent/property owner, or admin.</p>

        <form onSubmit={handleSignIn} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don&apos;t have an account? <a href="/sign-up" className="text-blue-600 hover:underline">Create one</a>
        </p>
      </div>
    </div>
  )
}
