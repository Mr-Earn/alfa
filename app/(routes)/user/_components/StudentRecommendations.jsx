"use client"

import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ListingCard from '@/app/_components/ListingCard'
import { getRentalMarketInsights, rankListings } from '@/lib/recommendation-engine.mjs'

const defaultPreferences = {
  budget: '1800',
  campus: '',
  accommodationType: 'any',
  lifestyle: 'quiet',
  minBedrooms: '0',
  minBathrooms: '0',
  requiresParking: false,
}

function compareListingPrice(firstListing, secondListing, direction = 1) {
  const firstPrice = Number(firstListing.price)
  const secondPrice = Number(secondListing.price)
  const hasFirstPrice = Number.isFinite(firstPrice) && firstPrice >= 0
  const hasSecondPrice = Number.isFinite(secondPrice) && secondPrice >= 0

  if (hasFirstPrice !== hasSecondPrice) return hasFirstPrice ? -1 : 1
  if (!hasFirstPrice) return 0
  return (firstPrice - secondPrice) * direction
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
      if (stored) {
        const saved = JSON.parse(stored)
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
          throw new Error('Saved accommodation preferences are invalid')
        }
        const budget = Number(saved.budget)
        const minBedrooms = Number(saved.minBedrooms)
        const minBathrooms = Number(saved.minBathrooms)
        const legacyType = ['shared-flat', 'private-room'].includes(saved.campus) ? saved.campus : 'any'
        const accommodationType = ['any', 'house', 'apartment', 'studio', 'shared-flat', 'private-room']
          .includes(saved.accommodationType)
          ? saved.accommodationType
          : legacyType
        setPreferences({
          ...defaultPreferences,
          budget: Number.isFinite(budget) && budget >= 0 ? String(budget) : defaultPreferences.budget,
          minBedrooms: Number.isFinite(minBedrooms) && minBedrooms >= 0
            ? String(Math.floor(minBedrooms))
            : defaultPreferences.minBedrooms,
          minBathrooms: Number.isFinite(minBathrooms) && minBathrooms >= 0
            ? String(Math.floor(minBathrooms))
            : defaultPreferences.minBathrooms,
          requiresParking: Boolean(saved.requiresParking),
          campus: ['near-campus', 'shared-flat', 'private-room'].includes(saved.campus) ? '' : String(saved.campus || ''),
          accommodationType,
          lifestyle: Object.hasOwn(lifestyleKeywords, saved.lifestyle) ? saved.lifestyle : defaultPreferences.lifestyle,
        })
      }
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

  const rankedListings = useMemo(
    () => rankListings(availableListings, preferences, searchQuery),
    [availableListings, preferences, searchQuery],
  )

  const recommendedListings = useMemo(() => {
    if (sortOrder === 'match') return rankedListings
    return [...rankedListings].sort((first, second) => {
      if (sortOrder === 'price-low') return compareListingPrice(first.listing, second.listing)
      if (sortOrder === 'price-high') return compareListingPrice(first.listing, second.listing, -1)
      return 0
    })
  }, [rankedListings, sortOrder])

  const visibleListings = showAllListings ? recommendedListings : recommendedListings.slice(0, 3)
  const bestMatch = recommendedListings[0]
  const marketInsights = useMemo(
    () => getRentalMarketInsights(availableListings, preferences.budget),
    [availableListings, preferences.budget],
  )

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }))
    setSavedMessage('')
  }

  const savePreferences = (event) => {
    event.preventDefault()
    try {
      localStorage.setItem('student_recommendation_preferences', JSON.stringify(preferences))
      setSavedMessage('Preferences saved on this device.')
    } catch (error) {
      console.error('Unable to save accommodation preferences', error)
      setSavedMessage('Unable to save preferences on this device.')
    }
  }

  return (
    <main className="mx-auto my-8 w-full max-w-7xl space-y-5 px-4 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Accommodation recommendations</h1>
        <p className="mt-1 text-sm text-slate-500">A transparent multi-criteria ranking compares available rental data with your requirements.</p>
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
              <input type="number" min="0" step="50" value={preferences.budget} onChange={(event) => updatePreference('budget', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-700">
              Minimum bedrooms
              <input type="number" min="0" step="1" value={preferences.minBedrooms} onChange={(event) => updatePreference('minBedrooms', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-700">
              Minimum bathrooms
              <input type="number" min="0" step="1" value={preferences.minBathrooms} onChange={(event) => updatePreference('minBathrooms', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-700">
              Preferred area or campus
              <input type="text" value={preferences.campus} onChange={(event) => updatePreference('campus', event.target.value)} placeholder="Enter a city, suburb, or campus name" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              <span className="mt-1 block text-xs text-slate-500">Area matching checks listing address and city text; it does not calculate distance.</span>
            </label>
            <label className="block text-sm text-slate-700">
              Accommodation type
              <select value={preferences.accommodationType} onChange={(event) => updatePreference('accommodationType', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="any">Any type</option>
                <option value="house">House</option>
                <option value="apartment">Apartment / flat</option>
                <option value="studio">Studio</option>
                <option value="shared-flat">Shared accommodation</option>
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={preferences.requiresParking} onChange={(event) => updatePreference('requiresParking', event.target.checked)} />
              Parking is required
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
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Active rental listings</p>
                <p className="mt-1 font-semibold text-slate-900">{marketInsights.activeListings}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Median listed rent</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {marketInsights.medianRent === null ? 'Not available' : `R${Math.round(marketInsights.medianRent).toLocaleString()}/mo`}
                </p>
              </div>
              <div className="col-span-2 rounded-lg bg-slate-50 p-3 sm:col-span-1">
                <p className="text-xs text-slate-500">Listings within budget</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {marketInsights.withinBudget === null ? 'Set a budget' : `${marketInsights.withinBudget} of ${marketInsights.pricedListings}`}
                </p>
              </div>
            </div>
          )}
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
                <p className="mt-1">{bestMatch.score}% preference score · {bestMatch.coverage}% of requested criteria could be evaluated. This is not a probability.</p>
              </div>
              {visibleListings.map(({ listing, score, coverage, components }) => (
                <article key={listing.id} className="relative overflow-hidden rounded-lg border border-slate-200">
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{score}% match</span>
                  <ListingCard listing={listing} availabilityCount={0} />
                  <div className="space-y-2 px-3 pb-3">
                    <p className="text-xs font-medium text-amber-800">NSFAS accreditation: not verified by this app</p>
                    <p className="text-xs text-slate-500">Criteria coverage: {coverage}%</p>
                    <div className="flex flex-wrap gap-2">
                      {components.map((component) => (
                        <span key={component.key} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {component.label}: {component.score}%
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">{availableListings.length ? 'No rentals match the current search and bedroom filter. Try adjusting your preferences.' : 'No active rentals are available yet.'}</p>}
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