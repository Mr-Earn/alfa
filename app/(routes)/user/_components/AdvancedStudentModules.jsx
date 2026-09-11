"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Bot, CircleDollarSign, Navigation, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/utils/supabase/client'

const defaultAssistantMessage = 'How can I help you find a safe, affordable place near campus today?'

export default function AdvancedStudentModules() {
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLog, setAssistantLog] = useState([defaultAssistantMessage])
  const [transportFilters, setTransportFilters] = useState({
    maxDistance: '1',
    shuttle: true,
    walking: true,
  })
  const [nsfasStatus, setNsfasStatus] = useState({
    fundingStatus: 'Approved',
    allowance: 'R 7,800',
    received: 'R 5,200',
    outstanding: 'R 2,600',
  })
  const [visitors, setVisitors] = useState([])
  const [realListings, setRealListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedAssistant = localStorage.getItem('student_assistant_log')
      if (storedAssistant) setAssistantLog(JSON.parse(storedAssistant))
      const storedFilters = localStorage.getItem('student_transport_filters')
      if (storedFilters) setTransportFilters(JSON.parse(storedFilters))
      const storedNsfas = localStorage.getItem('student_nsfas_status')
      if (storedNsfas) setNsfasStatus(JSON.parse(storedNsfas))
      const storedVisitors = localStorage.getItem('student_visitors')
      if (storedVisitors) setVisitors(JSON.parse(storedVisitors))
    } catch (error) {
      console.error('Failed to load advanced student modules', error)
    }
  }, [])

  useEffect(() => {
    const loadListings = async () => {
      setLoadingListings(true)
      const { data, error } = await supabase
        .from('listings')
        .select('id, price, address, bedroom, bathroom, area, type, propertyType, active')
        .eq('active', true)
        .order('id', { ascending: false })
        .limit(6)

      if (!error && data) {
        setRealListings(data)
      }
      setLoadingListings(false)
    }

    loadListings()
  }, [])

  const transportLabel = useMemo(() => {
    const distance = Number(transportFilters.maxDistance || 0)
    if (distance <= 1 && transportFilters.shuttle) return 'Excellent shuttle and walking access'
    if (distance <= 2) return 'Good access with public transport'
    return 'Consider a closer campus option'
  }, [transportFilters])

  const matchingListings = useMemo(() => {
    const budget = Number(nsfasStatus.allowance?.replace(/[^0-9.-]+/g, '') || 0)
    return realListings
      .filter((listing) => Number(listing.price || 0) <= budget || Number(listing.price || 0) <= budget + 1200)
      .slice(0, 3)
  }, [realListings, nsfasStatus.allowance])

  const sendAssistantMessage = (event) => {
    event.preventDefault()
    if (!assistantInput.trim()) return

    const response = assistantInput.toLowerCase().includes('nsfas')
      ? `Based on your current NSFAS summary, we recommend staying within ${nsfasStatus.allowance} for accommodation.`
      : assistantInput.toLowerCase().includes('transport') || assistantInput.toLowerCase().includes('shuttle')
        ? `We can prioritize listings within ${transportFilters.maxDistance} km of campus with shuttle access.`
        : `We found ${realListings.length} active listings that match your current search preferences.`

    const nextLog = [...assistantLog, assistantInput, response]
    setAssistantLog(nextLog)
    setAssistantInput('')
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_assistant_log', JSON.stringify(nextLog))
    }
  }

  const saveTransportFilters = (event) => {
    event.preventDefault()
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_transport_filters', JSON.stringify(transportFilters))
    }
  }

  const saveNsfasStatus = (event) => {
    event.preventDefault()
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_nsfas_status', JSON.stringify(nsfasStatus))
    }
  }

  const registerVisitor = (event) => {
    event.preventDefault()
    const nextVisitor = {
      id: Date.now(),
      name: `Visitor ${visitors.length + 1}`,
      purpose: 'Guest visit',
      status: 'Pending approval',
    }
    const nextVisitors = [nextVisitor, ...visitors]
    setVisitors(nextVisitors)
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_visitors', JSON.stringify(nextVisitors))
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">AI support assistant</h3>
        </div>
        <form onSubmit={sendAssistantMessage} className="space-y-3">
          <textarea
            value={assistantInput}
            onChange={(event) => setAssistantInput(event.target.value)}
            placeholder="Ask about leases, NSFAS support, or apartment options"
            className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          <Button type="submit" className="w-full">Ask assistant</Button>
        </form>
        <div className="mt-4 space-y-2">
          {assistantLog.map((item, index) => (
            <div key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Live listing match</p>
          {loadingListings ? (
            <p className="mt-1">Loading live listings…</p>
          ) : matchingListings.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {matchingListings.map((listing) => (
                <li key={listing.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="font-medium text-slate-900">{listing.address}</p>
                  <p>R {Number(listing.price || 0).toLocaleString()} • {listing.bedroom} bed • {listing.bathroom} bath</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">No live listings currently fit your criteria.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Campus distance & transport</h3>
        </div>
        <form onSubmit={saveTransportFilters} className="space-y-3">
          <label className="block text-sm text-slate-700">
            Max distance from campus (km)
            <input
              type="number"
              value={transportFilters.maxDistance}
              onChange={(event) => setTransportFilters({ ...transportFilters, maxDistance: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={transportFilters.shuttle}
              onChange={(event) => setTransportFilters({ ...transportFilters, shuttle: event.target.checked })}
            />
            Shuttle available
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={transportFilters.walking}
              onChange={(event) => setTransportFilters({ ...transportFilters, walking: event.target.checked })}
            />
            Walking distance preferred
          </label>
          <Button type="submit" className="w-full">Save transport filters</Button>
        </form>
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          <p className="font-semibold">Transport fit: {transportLabel}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-900">NSFAS financial management</h3>
        </div>
        <form onSubmit={saveNsfasStatus} className="space-y-3">
          <label className="block text-sm text-slate-700">
            Funding status
            <input
              value={nsfasStatus.fundingStatus}
              onChange={(event) => setNsfasStatus({ ...nsfasStatus, fundingStatus: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Accommodation allowance
            <input
              value={nsfasStatus.allowance}
              onChange={(event) => setNsfasStatus({ ...nsfasStatus, allowance: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Received
            <input
              value={nsfasStatus.received}
              onChange={(event) => setNsfasStatus({ ...nsfasStatus, received: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Outstanding balance
            <input
              value={nsfasStatus.outstanding}
              onChange={(event) => setNsfasStatus({ ...nsfasStatus, outstanding: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <Button type="submit" className="w-full">Save NSFAS summary</Button>
        </form>
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          <p className="font-semibold">Funding status: {nsfasStatus.fundingStatus}</p>
          <p className="mt-1">Allowance: {nsfasStatus.allowance}</p>
          <p>Received: {nsfasStatus.received}</p>
          <p>Outstanding: {nsfasStatus.outstanding}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Visitor management</h3>
        </div>
        <form onSubmit={registerVisitor} className="space-y-3">
          <p className="text-sm text-slate-600">Register guest visitors and request approval for overnight stays.</p>
          <Button type="submit" className="w-full">Register visitor</Button>
        </form>
        <ul className="mt-4 space-y-2">
          {visitors.map((visitor) => (
            <li key={visitor.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">{visitor.name}</span>
                <span className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">{visitor.status}</span>
              </div>
              <p className="mt-1">Purpose: {visitor.purpose}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
