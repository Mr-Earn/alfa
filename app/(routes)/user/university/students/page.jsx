"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

const defaultStudentForm = {
  full_name: '',
  email: '',
  university: '',
  course: '',
  phone: '',
  program: '',
}

export default function UniversityStudentsPage() {
  const [students, setStudents] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [studentForm, setStudentForm] = useState(defaultStudentForm)
  const [message, setMessage] = useState('')
  const [linkRequests, setLinkRequests] = useState([])

  const loadStudents = async () => {
    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const [profilesResponse, bookingsResponse, linksResponse] = await Promise.all([
        fetch('/api/profiles', { headers }),
        fetch('/api/bookings', { headers }),
        fetch('/api/university-links', { headers }),
      ])

      const profileData = await profilesResponse.json()
      const bookingData = await bookingsResponse.json()
      const linksData = await linksResponse.json()

      const list = Array.isArray(profileData?.profiles) ? profileData.profiles : []
      const filteredStudents = list.filter((profile) => (profile.role || '').toLowerCase() === 'student')
      const assignmentRows = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []

      setStudents(filteredStudents)
      setBookings(assignmentRows)
      setLinkRequests(Array.isArray(linksData?.links) ? linksData.links : [])
    } catch (error) {
      console.warn('Unable to load university students', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const getStudentBooking = (student) => {
    if (!student) return null

    return bookings.find((booking) => {
      const bookingUserMatch = booking.user_id && student.id && String(booking.user_id) === String(student.id)
      const bookingEmailMatch = (booking.contact_email || '').toLowerCase() === (student.email || '').toLowerCase()
      return bookingUserMatch || bookingEmailMatch
    }) || null
  }

  const assignmentCount = bookings.filter((booking) => booking.assigned_accommodation || booking.assigned_university || booking.assigned_gender).length

  const handleAssignmentChange = async (student, value) => {
    const booking = getStudentBooking(student)
    if (!booking) return

    try {
      setSavingId(booking.id)
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: booking.id,
          assigned_university: student.university || 'University-linked accommodation',
          assigned_accommodation: value,
          status: value === 'pending' ? 'pending' : 'approved',
        }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || 'Unable to update assignment')

      setBookings((current) => current.map((item) =>
        String(item.id) === String(booking.id)
          ? { ...item, assigned_university: student.university || 'University-linked accommodation', assigned_accommodation: value, status: value === 'pending' ? 'pending' : 'approved' }
          : item
      ))
      setMessage('Assignment updated for the selected student.')
    } catch (error) {
      console.warn('Unable to update student accommodation assignment', error)
      setMessage('Unable to update assignment right now.')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreateStudent = async (event) => {
    event.preventDefault()
    if (!studentForm.full_name.trim() || !studentForm.email.trim()) {
      setMessage('Please provide a student name and email.')
      return
    }

    try {
      setCreating(true)
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `student-${Date.now()}`,
          email: studentForm.email.trim(),
          role: 'student',
          full_name: studentForm.full_name.trim(),
          university: studentForm.university.trim(),
          course: studentForm.course.trim(),
          program: studentForm.program.trim(),
          phone: studentForm.phone.trim(),
        }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || 'Unable to create student profile')

      setStudents((current) => [json.profile, ...current].filter(Boolean))
      setStudentForm(defaultStudentForm)
      setMessage('Student profile created and synced to Supabase.')
    } catch (error) {
      console.warn('Unable to create student profile', error)
      setMessage('Unable to create the student profile right now.')
    } finally {
      setCreating(false)
    }
  }

  const handleLinkDecision = async (request, status) => {
    try {
      const headers = await getAuthenticatedRequestHeaders('university')
      const response = await fetch('/api/university-links', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update link request')
      setLinkRequests((current) => current.map((item) => item.id === request.id ? data.link : item))
      setMessage(`Link request ${status}.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <h3 className='text-xl font-semibold text-slate-900'>Student oversight</h3>
      <p className='mt-2 text-sm text-slate-600'>Track student accommodation progress, approvals, and university-linked housing assignments.</p>

      <div className='mt-5 grid gap-4 md:grid-cols-3'>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='text-sm text-slate-500'>Approved students</p>
          <p className='mt-2 text-2xl font-semibold text-slate-900'>{students.length || 0}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='text-sm text-slate-500'>Accommodation assignments</p>
          <p className='mt-2 text-2xl font-semibold text-slate-900'>{assignmentCount}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='text-sm text-slate-500'>Support cases</p>
          <p className='mt-2 text-2xl font-semibold text-slate-900'>{Math.max(1, Math.min(12, students.length || 1))}</p>
        </div>
      </div>

      <div className='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4'>
        <h4 className='font-semibold text-slate-900'>Create student</h4>
        <p className='mt-1 text-sm text-slate-600'>Add a student profile that will appear in the university dashboard and student oversight table.</p>
        <form onSubmit={handleCreateStudent} className='mt-4 grid gap-3 md:grid-cols-2'>
          <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Full name' value={studentForm.full_name} onChange={(event) => setStudentForm({ ...studentForm, full_name: event.target.value })} />
          <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Email' value={studentForm.email} onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })} />
          <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='University' value={studentForm.university} onChange={(event) => setStudentForm({ ...studentForm, university: event.target.value })} />
          <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Course or program' value={studentForm.course} onChange={(event) => setStudentForm({ ...studentForm, course: event.target.value })} />
          <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Phone number' value={studentForm.phone} onChange={(event) => setStudentForm({ ...studentForm, phone: event.target.value })} />
          <input className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Program' value={studentForm.program} onChange={(event) => setStudentForm({ ...studentForm, program: event.target.value })} />
          <div className='md:col-span-2 flex items-center gap-3'>
            <button type='submit' disabled={creating} className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60'>
              {creating ? 'Creating...' : 'Create student'}
            </button>
            {message ? <span className='text-sm text-slate-600'>{message}</span> : null}
          </div>
        </form>
      </div>

      <div className='mt-6 overflow-hidden rounded-xl border border-slate-200'>
        <table className='min-w-full divide-y divide-slate-200 text-left text-sm'>
          <thead className='bg-slate-50 text-slate-600'>
            <tr>
              <th className='px-4 py-3 font-medium'>Student</th>
              <th className='px-4 py-3 font-medium'>University</th>
              <th className='px-4 py-3 font-medium'>Course</th>
              <th className='px-4 py-3 font-medium'>Accommodation</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-200 bg-white'>
            {loading ? (
              <tr>
                <td className='px-4 py-6 text-slate-500' colSpan={4}>Loading students...</td>
              </tr>
            ) : students.length ? (
              students.slice(0, 8).map((student) => {
                const booking = getStudentBooking(student)
                const assignmentValue = booking?.assigned_accommodation || 'pending'
                const displayStatus = booking?.assigned_accommodation || booking?.assigned_university || booking?.assigned_gender || 'Pending'

                return (
                  <tr key={student.id || student.email}>
                    <td className='px-4 py-3'>
                      <div>
                        <p className='font-medium text-slate-900'>{student.full_name || student.email || 'Student'}</p>
                        <p className='text-xs text-slate-500'>{student.email || 'No email'}</p>
                      </div>
                    </td>
                    <td className='px-4 py-3'>{student.university || 'Not set'}</td>
                    <td className='px-4 py-3'>{student.course || student.program || 'Not set'}</td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col gap-2'>
                        <div className='flex items-center gap-2'>
                          <select
                            value={assignmentValue}
                            onChange={(event) => handleAssignmentChange(student, event.target.value)}
                            disabled={!booking || savingId === booking.id}
                            className='rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700'
                          >
                            <option value='pending'>Pending</option>
                            <option value='university-approved'>University Approved</option>
                            <option value='assigned'>Assigned to university accommodation</option>
                          </select>
                          <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'>
                            {displayStatus}
                          </span>
                        </div>
                        {student.email ? (
                          <Link
                            href={`/user/messages?recipient=${encodeURIComponent(student.email)}`}
                            className='inline-flex w-fit items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-700'
                          >
                            Message student
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className='px-4 py-6 text-slate-500' colSpan={4}>No student profiles found yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4'>
        <h4 className='font-semibold text-slate-900'>University link requests</h4>
        <p className='mt-1 text-sm text-slate-600'>Approve or reject students and property owners who want to link to this university.</p>
        <div className='mt-4 space-y-3'>
          {linkRequests.length ? linkRequests.map((request) => (
            <div key={request.id} className='flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between'>
              <div>
                <p className='font-medium text-slate-900'>{request.requester_email}</p>
                <p className='text-xs capitalize text-slate-500'>{request.requester_role} • {request.status}</p>
              </div>
              {request.status === 'pending' && <div className='flex gap-2'><button onClick={() => handleLinkDecision(request, 'approved')} className='rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white'>Accept</button><button onClick={() => handleLinkDecision(request, 'rejected')} className='rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white'>Reject</button></div>}
            </div>
          )) : <p className='text-sm text-slate-500'>No university link requests yet.</p>}
        </div>
      </div>
    </div>
  )
}
