"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Building2, DollarSign, ShieldCheck, Users } from 'lucide-react'

export default function AgentDashboard() {
  const [stats, setStats] = useState({
    listings: 0,
    enquiries: 0,
    verified: 0,
    occupancy: 0,
    pendingInvoices: 0,
  })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [bookingResponse, profileResponse, studentHubResponse] = await Promise.all([
          fetch('/api/bookings'),
          fetch('/api/profiles'),
          fetch('/api/student-hub'),
        ])

        const bookingData = await bookingResponse.json()
        const profileData = await profileResponse.json()
        const studentHubData = await studentHubResponse.json()
        const bookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
        const profiles = Array.isArray(profileData?.profiles) ? profileData.profiles : []
        const ownerCount = profiles.filter((profile) => profile.role === 'owner').length
        const agentCount = profiles.filter((profile) => profile.role === 'agent').length

        setStats({
          listings: Math.max(1, ownerCount + agentCount + Math.max(0, Math.floor(bookings.length / 2))),
          enquiries: bookings.length,
          verified: Math.max(0, Math.floor(bookings.length / 2)),
          occupancy: bookings.length > 0 ? Math.min(98, 70 + bookings.length * 2) : 82,
          pendingInvoices: Array.isArray(studentHubData?.invoices) ? studentHubData.invoices.filter((invoice) => invoice.status === 'Pending').length : 0,
        })
      } catch (error) {
        console.error('Failed to load agent stats', error)
      }
    }

    loadStats()
  }, [])

  const saveStats = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agent_dashboard_stats', JSON.stringify(stats))
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Agent workspace</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Listings', stats.listings],
            ['Enquiries', stats.enquiries],
            ['Verified', stats.verified],
            ['Occupancy', `${stats.occupancy}%`],
            ['Pending invoices', stats.pendingInvoices],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={saveStats}>Save agent summary</Button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Verification & approvals</h3>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">University-approved residences awaiting confirmation</li>
          <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">NSFAS verification requests in review</li>
          <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Property documents pending signature</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-900">Revenue & demand tracking</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Monthly revenue</p>
            <p className="text-xl font-semibold text-slate-900">R 142k</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">Pending payments</p>
            <p className="text-xl font-semibold text-slate-900">12</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-500">New leads</p>
            <p className="text-xl font-semibold text-slate-900">+18%</p>
          </div>
        </div>
      </section>
    </div>
  )
}
