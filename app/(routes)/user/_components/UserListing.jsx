"use client"

import { Button } from '@/components/ui/button'
import useSupabaseUser from '@/utils/supabase/useUser'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { Bath, BedDouble, MapPin, Ruler, Trash, Plus, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

function UserListing() {

  const user = useSupabaseUser()
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    if (!user?.email) return
    fetchUserListings()
  }, [user?.email])

  const fetchUserListings = async () => {
    setIsLoading(true)
    setError(null)
    setDebugInfo('')
    try {
      const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
      const response = await fetch('/api/listings', { headers })
      const json = await response.json()
      
      console.log('Listings API Response:', json)
      setDebugInfo(`Fetched ${json.listings?.length || 0} listings | User: ${user?.email} | Role: ${user?.user_metadata?.role}`)
      
      if (!response.ok) {
        setError(json?.error || 'Failed to fetch listings')
        setListings([])
        return
      }
      
      setListings(Array.isArray(json.listings) ? json.listings : [])
    } catch (err) {
      console.error('Listing fetch error:', err)
      setError(err.message || 'Network error fetching listings')
      setListings([])
    } finally {
      setIsLoading(false)
    }
  }

  const deleteListing = async (listingId) => {
    if (!listingId || !window.confirm('Delete this listing? This cannot be undone.')) return
    try {
      const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
      const response = await fetch('/api/listings', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: listingId }),
      })

      if (response.ok) {
        toast.success('Listing deleted successfully')
        await fetchUserListings()
      } else {
        const text = await response.text()
        console.error('Listing delete failed', text)
        toast.error('Failed to delete listing')
      }
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Error deleting listing')
    }
  }

  return (
    <div className='space-y-4'>
      {/* Header with Add Button */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='font-bold text-2xl'>Manage your listings</h2>
          <p className='text-sm text-gray-500 mt-1'>View, edit, and manage all your property listings</p>
        </div>
        <Link href='/add-new-listing'>
          <Button className='flex gap-2'>
            <Plus className='h-4 w-4' />
            Add New Listing
          </Button>
        </Link>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className='rounded-lg bg-blue-50 p-3 text-xs text-blue-700 border border-blue-200'>
          {debugInfo}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className='rounded-lg bg-red-50 p-4 border border-red-200 flex gap-3'>
          <AlertCircle className='h-5 w-5 text-red-600 flex-shrink-0 mt-0.5' />
          <div>
            <h3 className='font-semibold text-red-900'>Error loading listings</h3>
            <p className='text-sm text-red-700 mt-1'>{error}</p>
            <Button size='sm' variant='outline' className='mt-2' onClick={fetchUserListings}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Listings Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {isLoading ? (
          <>
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 animate-pulse'>
              Loading listings...
            </div>
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 animate-pulse'>
              Loading listings...
            </div>
          </>
        ) : listings.length > 0 ? (
          listings.map((item) => (
            <div key={item.id} className='relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-violet-300 hover:shadow-md'>
              {/* Status Badge */}
              <span className='absolute left-4 top-4 z-10 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm'>
                {item.active ? 'Published' : 'Draft'}
              </span>

              {/* Image */}
              <div className='relative h-[170px] w-full overflow-hidden bg-slate-100'>
                <Image
                  src={item?.listingImages?.[0]?.url || '/placeholder.svg'}
                  width={400}
                  height={170}
                  className='h-full w-full object-cover'
                  alt={item.address || 'Listing image'}
                />
              </div>

              {/* Content */}
              <div className='p-4 flex flex-col gap-3'>
                {/* Price and Title */}
                <div>
                  <h3 className='font-bold text-lg line-clamp-2'>{item.title}</h3>
                  <h2 className='font-bold text-xl text-violet-600 mt-1'>R{item?.price?.toLocaleString()}</h2>
                </div>

                {/* Address */}
                <div className='flex gap-2 text-sm text-gray-500'>
                  <MapPin className='h-4 w-4 flex-shrink-0 mt-0.5' />
                  <span className='line-clamp-2'>{item.address}</span>
                </div>

                {/* Features */}
                <div className='flex gap-2 text-xs'>
                  {item?.bedroom && (
                    <div className='flex gap-1 items-center bg-slate-100 px-2 py-1 rounded'>
                      <BedDouble className='h-3 w-3' />
                      <span>{item.bedroom} bed{item.bedroom !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {item?.bathroom && (
                    <div className='flex gap-1 items-center bg-slate-100 px-2 py-1 rounded'>
                      <Bath className='h-3 w-3' />
                      <span>{item.bathroom} bath</span>
                    </div>
                  )}
                  {item?.area && (
                    <div className='flex gap-1 items-center bg-slate-100 px-2 py-1 rounded'>
                      <Ruler className='h-3 w-3' />
                      <span>{item.area} m²</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='flex gap-2 pt-2 border-t border-slate-200'>
                  <Link href={'/view-listing/' + item.id} className='flex-1'>
                    <Button size='sm' variant='outline' className='w-full'>
                      View
                    </Button>
                  </Link>
                  <Link href={'/edit-listing/' + item.id} className='flex-1'>
                    <Button size='sm' className='w-full'>
                      Edit
                    </Button>
                  </Link>
                  <Button 
                    size='sm' 
                    variant='destructive' 
                    className='flex-1'
                    onClick={() => deleteListing(item.id)}
                  >
                    <Trash className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='rounded-xl border border-slate-200 bg-slate-50 p-8 text-center col-span-full'>
            <div className='space-y-3'>
              <h3 className='font-semibold text-slate-900'>No listings yet</h3>
              <p className='text-sm text-slate-600'>Start managing properties by creating your first listing.</p>
              <Link href='/add-new-listing'>
                <Button className='mt-4'>
                  <Plus className='h-4 w-4 mr-2' />
                  Create First Listing
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserListing