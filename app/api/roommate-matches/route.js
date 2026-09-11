import { NextResponse } from 'next/server'
import { getAuthenticatedRequestContext, normalizeRole } from '@/lib/permissions'
import { supabaseAdmin } from '@/utils/supabase/admin'

const demoStudents = [
  { id: 'demo-student-1', full_name: 'Anele Ndlovu', university: 'Cape Town University', course: 'Computer Science', roommate_preferences: { genderPreference: 'any', smokingPreference: 'no', studyHabit: 'focused', languagePreference: 'english', religiousConsideration: 'flexible', lifestylePreference: 'quiet' } },
  { id: 'demo-student-2', full_name: 'Mandla Khumalo', university: 'Cape Town University', course: 'Mechanical Engineering', roommate_preferences: { genderPreference: 'any', smokingPreference: 'no', studyHabit: 'balanced', languagePreference: 'english', religiousConsideration: 'flexible', lifestylePreference: 'social' } },
]

function scoreMatch(preferences, candidatePreferences = {}) {
  const rules = [
    ['genderPreference', 15, (first, second) => first === 'any' || second === 'any' || first === second],
    ['smokingPreference', 20, (first, second) => first === second],
    ['studyHabit', 20, (first, second) => first === second],
    ['languagePreference', 15, (first, second) => first === second],
    ['religiousConsideration', 10, (first, second) => first === 'flexible' || second === 'flexible' || first === second],
    ['lifestylePreference', 20, (first, second) => first === second],
  ]

  return rules.reduce((score, [key, weight, matches]) => (
    matches(preferences?.[key], candidatePreferences?.[key]) ? score + weight : score
  ), 0)
}

export async function POST(request) {
  const { user, role } = await getAuthenticatedRequestContext(request)
  if (!user || normalizeRole(role) !== 'student') {
    return NextResponse.json({ matches: [] }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const preferences = body?.preferences || {}
  let candidates = demoStudents

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('profiles')
      .upsert([{ id: user.id, email: user.email, role: 'student', roommate_preferences: preferences }], { onConflict: 'id' })

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,email,university,course,roommate_preferences')
      .eq('role', 'student')
      .neq('id', user.id)
      .limit(50)

    candidates = data || []
  }

  const matches = candidates
    .filter((candidate) => candidate.id !== user.id)
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.full_name || candidate.email || 'Student',
      university: candidate.university || 'University not specified',
      course: candidate.course || 'Course not specified',
      score: scoreMatch(preferences, candidate.roommate_preferences),
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)

  return NextResponse.json({ matches })
}