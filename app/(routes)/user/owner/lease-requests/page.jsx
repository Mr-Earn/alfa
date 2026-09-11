import React from 'react'
import OwnerDashboard from '../../_components/OwnerDashboard'

export default function OwnerLeaseRequestsPage() {
  return (
    <div>
      <h1 className='text-3xl font-bold text-slate-900 mb-4'>Lease requests</h1>
      <OwnerDashboard section='lease-requests' />
    </div>
  )
}
