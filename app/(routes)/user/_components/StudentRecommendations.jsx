"use client"

import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ListingCard from '@/app/_components/ListingCard'

const defaultPreferences = {
  budget: '1800',
  campus: 'near-campus',
  lifestyle: 'quiet',
  minBedrooms: '0',
}

function scoreListing(listing, preferences) {
  const text = `${listing.title || ''} ${listing.description || ''} ${listing.address || ''} ${listing.propertyType || listing.propertytype || ''}`.toLowerCase()
  const budget = Number(preferences.budget)
  const price = Number(listing.price)
  let earned = 0
  let possible = 0
  const reasons = []

  if (budget > 0 && Number.isFinite(price) && price > 0) {
    possible += 45
    const ratio = price / budget
    const points = ratio <= 0.8 ? 45 : ratio <= 1 ? 40 : ratio <= 1.2 ? 25 : 0
    earned += points
    reasons.push(points ? (ratio <= 1 ? 'Within budget' : 'Slightly over budget') : 'Over budget')
  }

  if (preferences.campus === 'near-campus') {
    if (listing.address || listing.title || listing.description) {
      possible += 25
      const matches = /campus|university|student|college/.test(text)
      if (matches) earned += 25
      reasons.push(matches ? 'Near-campus details found' : 'Campus proximity not mentioned')
    }
  } else {
    possible += 25
    const matches = preferences.campus === 'private-room'
      ? /private room|room|studio/.test(text)
      : /shared|flat|apartment/.test(text)
    if (matches) earned += 25
    reasons.push(matches ? 'Preferred accommodation type' : 'Type not clearly listed')
  }

  const minBedrooms = Number(preferences.minBedrooms || 0)
  const bedrooms = Number(listing.bedroom)
  if (minBedrooms > 0 && Number.isFinite(bedrooms)) {
    possible += 15
    const matches = bedrooms >= minBedrooms
    if (matches) earned += 15
    reasons.push(matches ? 'Bedroom count matches' : 'Fewer bedrooms than preferred')
  }

  possible += 15
  const lifestyleTerms = preferences.lifestyle === 'quiet'
    ? /quiet|peaceful|calm|study|tranquil/
    : preferences.lifestyle === 'social'
      ? /social|communal|shared|common area|entertainment/
      : /study|desk|internet|quiet|student/
  const lifestyleMatches = lifestyleTerms.test(text)
  if (lifestyleMatches) earned += 15
  reasons.push(lifestyleMatches ? 'Lifestyle details match' : 'Lifestyle details not mentioned')

  return { score: possible ? Math.round((earned / possible) * 100) : 0, reasons }
}

export default function StudentRecommendations() {
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [availableListings, setAvailableListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('match')
  const [showAllListings, setShowAllListings] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('student_recommendation_preferences')
      if (stored) setPreferences((current) => ({ ...current, ...JSON.parse(stored) }))
    } catch (error) {
      console.warn('Unable to load accommodation preferences', error)
    }
  }, [])

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const response = await fetch('/api/listings-public?type=Rent')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load rental listings.')
        setAvailableListings(Array.isArray(data?.listings) ? data.listings : [])
      } catch (error) {
        setAvailableListings([])
        setLoadError(error.message || 'Unable to load rental listings.')
      } finally {
        setLoading(false)
      }
    }

    loadListings()
  }, [])

  const matchingListings = useMemo(() => availableListings
    .filter((listing) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery = !query || `${listing.title || ''} ${listing.address || ''} ${listing.city || ''} ${listing.description || ''}`.toLowerCase().includes(query)
      const minBedrooms = Number(preferences.minBedrooms || 0)
      const bedroomCount = Number(listing.bedroom)
      const matchesBedrooms = minBedrooms <= 0 || !Number.isFinite(bedroomCount) || bedroomCount >= minBedrooms
      return matchesQuery && matchesBedrooms
    })
    .map((listing) => ({ listing, ...scoreListing(listing, preferences) }))
    , [availableListings, preferences, searchQuery])

  const bestMatch = useMemo(() => [...matchingListings].sort((first, second) => (
    second.score - first.score || Number(first.listing.price || 0) - Number(second.listing.price || 0)
  ))[0], [matchingListings])

  const recommendedListings = useMemo(() => [...matchingListings].sort((first, second) => {
      if (sortOrder === 'price-low') return Number(first.listing.price || 0) - Number(second.listing.price || 0)
      if (sortOrder === 'price-high') return Number(second.listing.price || 0) - Number(first.listing.price || 0)
      return second.score - first.score || Number(first.listing.price || 0) - Number(second.listing.price || 0)
    }), [matchingListings, sortOrder])

  const visibleListings = showAllListings ? recommendedListings : recommendedListings.slice(0, 3)

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }))
    setSavedMessage('')
  }

  const savePreferences = (event) => {
    event.preventDefault()
    localStorage.setItem('student_recommendation_preferences', JSON.stringify(preferences))
    setSavedMessage('Preferences saved.')
  }

  return (
    <main className="mx-auto my-8 w-full max-w-7xl space-y-5 px-4 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Accommodation recommendations</h1>
        <p className="mt-1 text-sm text-slate-500">Ranked rental options based on your budget, location, and lifestyle.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Your preferences</h2>
          </div>
          <form onSubmit={savePreferences} className="space-y-3">
            <label className="block text-sm text-slate-700">
              Monthly budget (ZAR)
              <input type="number" min="0" value={preferences.budget} onChange={(event) => updatePreference('budget', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-700">
              Minimum bedrooms
              <input type="number" min="0" value={preferences.minBedrooms} onChange={(event) => updatePreference('minBedrooms', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-700">
              Preferred accommodation
              <select value={preferences.campus} onChange={(event) => updatePreference('campus', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="near-campus">Near campus</option>
                <option value="shared-flat">Shared flat</option>
                <option value="private-room">Private room</option>
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Lifestyle
              <select value={preferences.lifestyle} onChange={(event) => updatePreference('lifestyle', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="quiet">Quiet</option>
                <option value="social">Social</option>
                <option value="study-focused">Study-focused</option>
              </select>
            </label>
            <Button type="submit" className="w-full">Save preferences</Button>
            {savedMessage && <p role="status" className="text-sm text-emerald-700">{savedMessage}</p>}
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Recommended homes</h2>
            {!loading && !loadError && <span className="text-sm text-slate-500">{showAllListings ? `${recommendedListings.length} matches` : `${Math.min(recommendedListings.length, 3)} of ${recommendedListings.length} matches`}</span>}
          </div>
          {!loading && !loadError && (
            <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input aria-label="Search recommended rentals" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setShowAllListings(false) }} placeholder="Search title, area, or details" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" />
              </label>
              <label className="sr-only" htmlFor="recommendation-sort">Sort recommendations</label>
              <select id="recommendation-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="match">Best match</option>
                <option value="price-low">Lowest rent</option>
                <option value="price-high">Highest rent</option>
              </select>
            </div>
          )}
          {loading ? <p className="text-sm text-slate-500">Finding homes that fit your preferences...</p> : loadError ? (
            <p role="alert" className="text-sm text-rose-700">{loadError}</p>
          ) : recommendedListings.length ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Best match: {bestMatch.listing.title || 'Rental listing'}</p>
                <p className="mt-1">{bestMatch.score}% preference fit based on available listing details.</p>
              </div>
              {visibleListings.map(({ listing, score, reasons }) => (
                <article key={listing.id} className="relative overflow-hidden rounded-lg border border-slate-200">
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{score}% match</span>
                  <ListingCard listing={listing} availabilityCount={0} />
                  <p className="px-3 pb-3 text-xs text-slate-600">{reasons.join(' · ')}</p>
                </article>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No active rentals are available yet.</p>}
          {!loading && !loadError && recommendedListings.length > 3 && (
            <button type="button" onClick={() => setShowAllListings((current) => !current)} className="mt-4 text-sm font-medium text-blue-700 hover:underline">
              {showAllListings ? 'Show top 3' : `Show all ${recommendedListings.length} matches`}
            </button>
          )}
        </section>
      </div>
    </main>
  )
}