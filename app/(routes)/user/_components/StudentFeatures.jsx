"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { BadgeCheck, Clock3, Sparkles, Store, Users, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ListingCard from '@/app/_components/ListingCard'
import AdvancedStudentModules from './AdvancedStudentModules'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const defaultRecommendation = {
  budget: '1800',
  campus: 'near-campus',
  lifestyle: 'quiet',
}

const defaultRoommatePreferences = {
  genderPreference: 'any',
  smokingPreference: 'no',
  studyHabit: 'focused',
  languagePreference: 'english',
  religiousConsideration: 'flexible',
  lifestylePreference: 'quiet',
}

const defaultMaintenance = {
  type: 'maintenance',
  description: '',
  urgency: 'medium',
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

  possible += 15
  const lifestyleTerms = preferences.lifestyle === 'quiet'
    ? /quiet|peaceful|calm|study|tranquil/
    : preferences.lifestyle === 'social'
      ? /social|communal|shared|common area|entertainment/
      : /study|desk|internet|quiet|student/
  const lifestyleMatches = lifestyleTerms.test(text)
  if (lifestyleMatches) earned += 15
  reasons.push(lifestyleMatches ? 'Lifestyle details match' : 'Lifestyle details not mentioned')

  return {
    score: possible ? Math.round((earned / possible) * 100) : 0,
    reasons,
  }
}

export default function StudentFeatures({ role }) {
  const [recommendationForm, setRecommendationForm] = useState(defaultRecommendation)
  const [roommatePreferences, setRoommatePreferences] = useState(defaultRoommatePreferences)
  const [maintenanceForm, setMaintenanceForm] = useState(defaultMaintenance)
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [waitingList, setWaitingList] = useState(null)
  const [availableListings, setAvailableListings] = useState([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(true)
  const [roommateMatches, setRoommateMatches] = useState([])
  const [loadingRoommateMatches, setLoadingRoommateMatches] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedRecommendations = localStorage.getItem('student_recommendation_preferences')
      if (storedRecommendations) {
        setRecommendationForm(JSON.parse(storedRecommendations))
      }

      const storedRoommates = localStorage.getItem('student_roommate_preferences')
      if (storedRoommates) {
        setRoommatePreferences(JSON.parse(storedRoommates))
      }

      const storedMaintenance = localStorage.getItem('student_maintenance_requests')
      if (storedMaintenance) {
        setMaintenanceRequests(JSON.parse(storedMaintenance))
      }

      const storedWaitingList = localStorage.getItem('student_waiting_list')
      if (storedWaitingList) {
        setWaitingList(JSON.parse(storedWaitingList))
      }
    } catch (error) {
      console.error('Failed to load student dashboard data', error)
    }
  }, [])

  useEffect(() => {
    const loadRoommateMatches = async () => {
      try {
        const headers = await getAuthenticatedRequestHeaders(role || 'student')
        const response = await fetch('/api/roommate-matches', {
          method: 'POST',
          headers,
          body: JSON.stringify({ preferences: roommatePreferences }),
        })
        const data = await response.json()
        setRoommateMatches(Array.isArray(data?.matches) ? data.matches : [])
      } catch (error) {
        console.warn('Unable to load roommate matches', error)
        setRoommateMatches([])
      } finally {
        setLoadingRoommateMatches(false)
      }
    }

    loadRoommateMatches()
  }, [roommatePreferences, role])

  useEffect(() => {
    const loadStudentHubData = async () => {
      try {
        const response = await fetch('/api/student-hub')
        const data = await response.json()

        if (Array.isArray(data?.maintenance)) {
          const mappedMaintenance = data.maintenance.map((item) => ({
            id: item.id ?? Date.now() + Math.random(),
            type: item.title || 'maintenance',
            description: item.description || 'No details provided yet',
            urgency: 'medium',
            status: item.status || 'Open',
          }))
          setMaintenanceRequests(mappedMaintenance)
          localStorage.setItem('student_maintenance_requests', JSON.stringify(mappedMaintenance))
        }

        if (data?.waitingList) {
          const nextWaitingList = {
            id: Date.now(),
            preferredArea: data.waitingList[0]?.course || recommendationForm.campus,
            budget: data.waitingList[0]?.budget || recommendationForm.budget,
            queuePosition: data.waitingList[0]?.queue || 3,
          }
          setWaitingList(nextWaitingList)
          localStorage.setItem('student_waiting_list', JSON.stringify(nextWaitingList))
        }
      } catch (error) {
        console.warn('Unable to sync student dashboard with backend', error)
      }
    }

    loadStudentHubData()
  }, [recommendationForm.budget, recommendationForm.campus])

  useEffect(() => {
    const loadAvailableListings = async () => {
      try {
        const response = await fetch('/api/listings-public?type=Rent')
        const data = await response.json()
        setAvailableListings(Array.isArray(data?.listings) ? data.listings : [])
      } catch (error) {
        console.warn('Unable to load accommodation recommendations', error)
        setAvailableListings([])
      } finally {
        setLoadingRecommendations(false)
      }
    }

    loadAvailableListings()
  }, [])

  const recommendedListings = useMemo(() => {
    return availableListings
      .map((listing) => {
        const { score, reasons } = scoreListing(listing, recommendationForm)
        return { listing, score, reasons }
      })
      .sort((first, second) => second.score - first.score || Number(first.listing.price || 0) - Number(second.listing.price || 0))
      .slice(0, 3)
  }, [availableListings, recommendationForm])

  const roommateScore = useMemo(() => {
    let score = 62

    if (roommatePreferences.genderPreference === 'any') score += 6
    if (roommatePreferences.smokingPreference === 'no') score += 8
    if (roommatePreferences.studyHabit === 'focused') score += 8
    if (roommatePreferences.languagePreference === 'english') score += 5
    if (roommatePreferences.lifestylePreference === 'quiet') score += 6
    if (roommatePreferences.religiousConsideration === 'flexible') score += 4

    return Math.min(score, 94)
  }, [roommatePreferences])

  const handleRecommendationSubmit = async (event) => {
    event.preventDefault()
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_recommendation_preferences', JSON.stringify(recommendationForm))
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      await fetch('/api/student-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'maintenance',
          entry: { title: 'Preference update', description: `Budget ${recommendationForm.budget} • ${recommendationForm.campus} • ${recommendationForm.lifestyle}`, owner: user?.email || 'student' },
        }),
      })
    } catch (error) {
      console.warn('Failed to sync recommendation data', error)
    }
  }

  const handleRoommateSubmit = (event) => {
    event.preventDefault()
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_roommate_preferences', JSON.stringify(roommatePreferences))
    }
  }

  const handleMaintenanceSubmit = async (event) => {
    event.preventDefault()
    const newRequest = {
      id: Date.now(),
      type: maintenanceForm.type,
      description: maintenanceForm.description,
      urgency: maintenanceForm.urgency,
      status: 'Open',
    }

    const nextRequests = [newRequest, ...maintenanceRequests]
    setMaintenanceRequests(nextRequests)
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_maintenance_requests', JSON.stringify(nextRequests))
    }

    try {
      await fetch('/api/student-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'maintenance',
          entry: { title: maintenanceForm.type, description: maintenanceForm.description, owner: 'Student' },
        }),
      })
    } catch (error) {
      console.warn('Failed to sync maintenance request', error)
    }

    setMaintenanceForm({ ...defaultMaintenance, description: '' })
  }

  const handleWaitingListSubmit = async (event) => {
    event.preventDefault()
    const nextEntry = {
      id: Date.now(),
      preferredArea: recommendationForm.campus,
      budget: recommendationForm.budget,
      queuePosition: maintenanceRequests.length + 3,
    }
    setWaitingList(nextEntry)
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_waiting_list', JSON.stringify(nextEntry))
    }

    try {
      await fetch('/api/student-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'waitingList',
          entry: {
            name: 'Student',
            course: recommendationForm.campus,
            budget: `${recommendationForm.budget} ZAR`,
          },
        }),
      })
    } catch (error) {
      console.warn('Failed to sync waiting list request', error)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">AI accommodation matching</h3>
        </div>
        <form onSubmit={handleRecommendationSubmit} className="space-y-3">
          <label className="block text-sm text-slate-700">
            Budget (ZAR)
            <input
              type="number"
              value={recommendationForm.budget}
              onChange={(event) => setRecommendationForm({ ...recommendationForm, budget: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Preferred location
            <select
              value={recommendationForm.campus}
              onChange={(event) => setRecommendationForm({ ...recommendationForm, campus: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="near-campus">Near campus</option>
              <option value="shared-flat">Shared flat</option>
              <option value="private-room">Private room</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Lifestyle
            <select
              value={recommendationForm.lifestyle}
              onChange={(event) => setRecommendationForm({ ...recommendationForm, lifestyle: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="quiet">Quiet</option>
              <option value="social">Social</option>
              <option value="study-focused">Study-focused</option>
            </select>
          </label>
          <Button type="submit" className="w-full">Save preferences</Button>
        </form>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">
            {recommendedListings.length
              ? `Best match: ${recommendedListings[0].listing.title || 'Rental listing'}`
              : loadingRecommendations ? 'Finding your best match...' : 'Your preferences are ready'}
          </p>
          <p className="mt-1">
            {recommendedListings.length
              ? `${recommendedListings[0].score}% preference fit, based on available listing details.`
              : 'Matches are ranked by budget, accommodation type or campus proximity, and lifestyle.'}
          </p>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-900">Recommended homes</h4>
            {!loadingRecommendations && <span className="text-xs text-slate-500">Top {recommendedListings.length} matches</span>}
          </div>
          {loadingRecommendations ? (
            <p className="text-sm text-slate-500">Finding homes that fit your preferences...</p>
          ) : recommendedListings.length ? (
            <div className="space-y-3">
              {recommendedListings.map(({ listing, score, reasons }) => (
                <div key={listing.id} className="relative overflow-hidden rounded-xl border border-slate-200">
                  <div className="absolute right-2 top-2 z-10 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {score}% match
                  </div>
                  <ListingCard listing={listing} availabilityCount={0} />
                  <p className="px-3 pb-3 text-xs text-slate-600">{reasons.join(' · ')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No active rentals are available yet. Your preferences are saved for the next listing.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Smart roommate matching</h3>
        </div>
        <form onSubmit={handleRoommateSubmit} className="space-y-3">
          <label className="block text-sm text-slate-700">
            Gender preference
            <select
              value={roommatePreferences.genderPreference}
              onChange={(event) => setRoommatePreferences({ ...roommatePreferences, genderPreference: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="any">Any</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Smoking
            <select
              value={roommatePreferences.smokingPreference}
              onChange={(event) => setRoommatePreferences({ ...roommatePreferences, smokingPreference: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="no">No smoking</option>
              <option value="occasional">Occasional</option>
              <option value="yes">Okay with smoking</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Study habits
            <select
              value={roommatePreferences.studyHabit}
              onChange={(event) => setRoommatePreferences({ ...roommatePreferences, studyHabit: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="focused">Focused</option>
              <option value="balanced">Balanced</option>
              <option value="social">Social</option>
            </select>
          </label>
          <Button type="submit" className="w-full">Save preferences</Button>
        </form>
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          <p className="font-semibold">Compatibility score: {roommateScore}%</p>
          <p className="mt-1">Matches are ranked using study habits, lifestyle, smoking, language, and other preferences.</p>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-900">Suggested roommates</h4>
            {!loadingRoommateMatches && <span className="text-xs text-slate-500">Top {roommateMatches.length} matches</span>}
          </div>
          {loadingRoommateMatches ? (
            <p className="text-sm text-slate-500">Finding compatible students...</p>
          ) : roommateMatches.length ? (
            <div className="space-y-2">
              {roommateMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{match.name}</p>
                    <p className="truncate text-xs text-slate-600">{match.course} • {match.university}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{match.score}% match</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No other student profiles are ready for matching yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-900">Maintenance portal</h3>
        </div>
        <form onSubmit={handleMaintenanceSubmit} className="space-y-3">
          <label className="block text-sm text-slate-700">
            Request type
            <select
              value={maintenanceForm.type}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, type: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="maintenance">Maintenance</option>
              <option value="damage">Damage report</option>
              <option value="security">Security issue</option>
              <option value="cleaning">Cleaning request</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Details
            <textarea
              value={maintenanceForm.description}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })}
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Describe the issue"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Urgency
            <select
              value={maintenanceForm.urgency}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, urgency: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <Button type="submit" className="w-full">Submit request</Button>
        </form>
        <ul className="mt-4 space-y-2">
          {maintenanceRequests.map((request) => (
            <li key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">{request.type}</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{request.status}</span>
              </div>
              <p className="mt-1">{request.description || 'No details provided yet'}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Accommodation waiting list</h3>
        </div>
        <form onSubmit={handleWaitingListSubmit} className="space-y-3">
          <p className="text-sm text-slate-600">Join a waiting list for preferred accommodation when your first choice is full.</p>
          <Button type="submit" className="w-full">Join waiting list</Button>
        </form>
        {waitingList ? (
          <div className="mt-4 rounded-xl bg-purple-50 p-3 text-sm text-purple-700">
            <p className="font-semibold">You are on the waiting list</p>
            <p className="mt-1">Queue position: #{waitingList.queuePosition}</p>
            <p>Preferred area: {waitingList.preferredArea}</p>
            <p>Budget: {waitingList.budget} ZAR</p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
            No active waiting list request yet.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Community and student tools</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">Marketplace</p>
            <p className="mt-1 text-sm text-slate-600">Buy and sell textbooks, furniture, and study materials.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">NSFAS support</p>
            <p className="mt-1 text-sm text-slate-600">Track funding, payments, and outstanding balances.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">Verified listings</p>
            <p className="mt-1 text-sm text-slate-600">Spot verified properties and university-approved residences faster.</p>
          </div>
        </div>
      </section>

      <div className="lg:col-span-2">
        <AdvancedStudentModules />
      </div>
    </div>
  )
}
