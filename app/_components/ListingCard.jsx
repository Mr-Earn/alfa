import { Bath, BedDouble, Ruler, MapPin, Heart, Share2, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'

function ListingCard({ listing, availabilityCount }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const propertyType = listing?.propertyType ?? listing?.propertytype ?? 'Apartment'
  
  // Try to get image from listing or use a default beautiful placeholder
  const imageUrl = listing?.listingImages?.[0]?.url || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'
  const availability = availabilityCount || 0
  
  return (
    <Link href={`/view-listing/${listing.id}`}>
      <div className='group h-full rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer'>
        
        {/* Image Container */}
        <div className='relative overflow-hidden bg-slate-200 h-48'>
          <Image
            src={imageUrl}
            alt={listing.title}
            width={400}
            height={250}
            className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300'
          />
          
          {/* Overlay */}
          <div className='absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity' />
          
          {/* Top Badges */}
          <div className='absolute top-3 left-3 right-3 flex justify-between items-start'>
            <div className='flex gap-2'>
              {listing.type && (
                <span className='bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold'>
                  {listing.type}
                </span>
              )}
              {availability > 0 && (
                <span className='bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold'>
                  {availability} Available
                </span>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className='flex gap-2'>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setIsFavorite(!isFavorite)
                }}
                className='bg-white rounded-full p-2 hover:bg-slate-100 transition-colors shadow-md'
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-600'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className='p-4 flex flex-col gap-3 h-full'>
          
          {/* Title and Price */}
          <div>
            <h3 className='font-bold text-lg text-slate-900 line-clamp-2'>
              {listing.title}
            </h3>
            <div className='flex items-center gap-1 text-slate-600 text-sm mt-1'>
              <MapPin className='w-4 h-4 text-slate-500' />
              <span className='line-clamp-1'>{listing.address}</span>
            </div>
          </div>

          {/* Price */}
          <div className='py-2 border-y border-slate-200'>
            <div className='text-2xl font-bold text-slate-900'>
              R{listing.price?.toLocaleString()}
              {listing.type === 'Rent' && <span className='text-sm text-slate-600 font-normal'>/mo</span>}
            </div>
          </div>

          {/* Features Grid */}
          <div className='grid grid-cols-3 gap-3 text-center'>
            <div className='bg-slate-50 rounded-lg p-2'>
              <BedDouble className='w-4 h-4 mx-auto text-blue-600 mb-1' />
              <div className='text-sm font-semibold text-slate-900'>{listing.bedroom || 0}</div>
              <div className='text-xs text-slate-600'>Bedrooms</div>
            </div>
            
            <div className='bg-slate-50 rounded-lg p-2'>
              <Bath className='w-4 h-4 mx-auto text-blue-600 mb-1' />
              <div className='text-sm font-semibold text-slate-900'>{listing.bathroom || 0}</div>
              <div className='text-xs text-slate-600'>Bathrooms</div>
            </div>
            
            <div className='bg-slate-50 rounded-lg p-2'>
              <Ruler className='w-4 h-4 mx-auto text-blue-600 mb-1' />
              <div className='text-sm font-semibold text-slate-900'>{listing.area || 'N/A'}</div>
              <div className='text-xs text-slate-600'>Sq.Ft</div>
            </div>
          </div>

          {/* Additional Details */}
          {(propertyType || listing.parking) && (
            <div className='bg-slate-50 rounded-lg p-3 text-sm space-y-1'>
              {propertyType && (
                <div className='flex justify-between'>
                  <span className='text-slate-600'>Type:</span>
                  <span className='font-semibold text-slate-900'>{propertyType}</span>
                </div>
              )}
              {listing.parking && (
                <div className='flex justify-between'>
                  <span className='text-slate-600'>Parking:</span>
                  <span className='font-semibold text-slate-900'>{listing.parking} spaces</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <p className='text-sm text-slate-600 line-clamp-2'>
              {listing.description}
            </p>
          )}

          {/* CTA Button */}
          <div className='pt-2 border-t border-slate-200'>
            <div className='w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-center flex items-center justify-center gap-2 transition-colors group-hover:bg-blue-700'>
              <Eye className='w-4 h-4' />
              View Listing
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default ListingCard
