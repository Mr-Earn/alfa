"use client"

import { useEffect, useState } from 'react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'

export default function UniversityCompliancePage() {
  const [checks, setChecks] = useState([])

  useEffect(() => {
    const loadCompliance = async () => {
      try {
        const headers = await getAuthenticatedRequestHeaders('university')
        const response = await fetch('/api/student-hub', { headers })
        const data = await response.json()

        const maintenanceCount = Array.isArray(data?.maintenance) ? data.maintenance.length : 0
        const inspectionCount = Array.isArray(data?.inspections) ? data.inspections.length : 0
        const accreditationCount = Array.isArray(data?.accreditations) ? data.accreditations.length : 0
        const visitorCount = Array.isArray(data?.visitors) ? data.visitors.length : 0

        setChecks([
          { label: 'Residence audit completion', value: '87%', tone: 'emerald' },
          { label: 'Open incident reports', value: `${maintenanceCount}`, tone: 'amber' },
          { label: 'Inspection schedule', value: `${inspectionCount}`, tone: 'sky' },
          { label: 'Accreditations', value: `${accreditationCount}`, tone: 'violet' },
          { label: 'Visitor approvals', value: `${visitorCount}`, tone: 'slate' },
        ])
      } catch (error) {
        console.warn('Unable to load compliance data', error)
      }
    }

    loadCompliance()
  }, [])

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <h3 className='text-xl font-semibold text-slate-900'>Compliance and oversight</h3>
      <p className='mt-2 text-sm text-slate-600'>Review housing legislation, residence audits, accreditation checks, and outstanding risk items.</p>

      <div className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {checks.map((check) => (
          <div key={check.label} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-sm text-slate-500'>{check.label}</p>
            <p className='mt-2 text-2xl font-semibold text-slate-900'>{check.value}</p>
          </div>
        ))}
      </div>

      <div className='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4'>
        <h4 className='font-semibold text-slate-900'>Priority actions</h4>
        <ul className='mt-3 space-y-2 text-sm text-slate-600'>
          <li>• Review high-priority incident reports before the next inspection cycle.</li>
          <li>• Finalize accreditation submissions for all partner residences.</li>
          <li>• Confirm compliance sign-offs for any overnight visitor approvals.</li>
        </ul>
      </div>
    </div>
  )
}
