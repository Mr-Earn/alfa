import React from 'react'
import OwnerDashboard from '../../_components/OwnerDashboard'

export default function OwnerOverviewPage() {
  return (
    <div>
      <h1 className='text-3xl font-bold text-slate-900 mb-4'>Owner overview</h1>
      <OwnerDashboard section='overview' />
    </div>
  )
}
