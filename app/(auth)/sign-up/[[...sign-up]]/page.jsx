"use client"
import React, { useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const normalizeRole = (value) => {
  if (value === 'agent') return 'agent'
  if (value === 'owner') return 'owner'
  if (value === 'university') return 'university'
  if (value === 'admin') return 'admin'
  return 'student'
}

export default function Page() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState('student')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e) => {
    e.preventDefault()
    const selectedRole = normalizeRole(role)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: selectedRole,
          full_name: fullName,
          phone,
          phone_number: phone,
          company_name: companyName,
        },
      },
    })

    setLoading(false)
    if (error) {
      toast(error.message)
      return
    }

    try {
      localStorage.setItem('preferred_role', selectedRole)
      const userId = data?.user?.id
      if (userId) {
        const headers = await getAuthenticatedRequestHeaders(selectedRole)
        await fetch('/api/profiles', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: userId, email, role: selectedRole, phone, full_name: fullName, company_name: companyName }),
        })
      }
    } catch (e) {
      console.error('Failed to persist preferred role', e)
    }

    toast('Account created. Please check your email to confirm before signing in.')
    router.push('/sign-in')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg shadow-slate-200">
        <h1 className="text-3xl font-bold mb-2 text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-600 mb-6">Register as a student, agent, property owner, university user, or admin.</p>
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Agency, property name, or institution (optional)"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Account type
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="student">Student</option>
              <option value="agent">Agent</option>
              <option value="owner">Property Owner</option>
              <option value="university">University</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account? <a href="/sign-in" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}