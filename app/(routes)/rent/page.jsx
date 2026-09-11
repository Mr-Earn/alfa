import ListingMapView from '@/app/_components/ListingMapView'
import React from 'react'

function ForRent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      {/* Header */}
      <div className="px-10 mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Properties for Rent</h1>
        <p className="text-slate-600">Find your perfect rental accommodation</p>
      </div>

      {/* Main Content */}
      <div className="px-6">
        <ListingMapView type='Rent' />
      </div>
    </div>
  )
}

export default ForRent