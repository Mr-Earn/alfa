import { MapPin, Search } from 'lucide-react'
import React, { useState } from 'react'
import GoogleAddressSearch from './GoogleAddressSearch'
import { Button } from '@/components/ui/button'
import FilterSection from './FilterSection'
import ListingCard from './ListingCard'

function Listing({listing,availabilityMap,handleSearchClick,searchedAddress,
    setBathCount,
    setBedCount,
    setParkingCount,
    setHomeType,
    setCoordinates
}) {
  const [address,setAddress]=useState();
  return (
    <div>
        <div className='p-3 flex gap-3 flex-col'>
            <div className='flex gap-3'>
                <div className='flex-1'>
                    <GoogleAddressSearch
                    selectedAddress={(v)=>{searchedAddress(v);
                    setAddress(v)}}
                    setCoordinates={setCoordinates}
                    />
                </div>
                <Button className="flex gap-2 px-6"
                onClick={handleSearchClick}
                >
                     <Search className='h-4 w-4'/> 
                Search</Button>
            </div>
            <FilterSection
            setBathCount={setBathCount}
            setBedCount={setBedCount}
            setParkingCount={setParkingCount}
            setHomeType={setHomeType}
            />
        </div>

        {address&&<div className='px-3 my-5'>
           <h2 className='text-2xl font-bold text-slate-900'>
           Found  <span className='text-blue-600'>{listing?.length}</span> Properties in <span className='text-blue-600'>{address?.label}</span></h2> 
           <p className='text-slate-600 text-sm mt-1'>Browse available listings in your desired location</p>
        </div>}

        {!listing || listing?.length === 0 ? (
            <div className='px-3 py-12 text-center'>
                <div className='bg-slate-50 rounded-lg p-8'>
                    <MapPin className='w-16 h-16 text-slate-300 mx-auto mb-4' />
                    <h3 className='text-xl font-semibold text-slate-900 mb-2'>No Listings Found</h3>
                    <p className='text-slate-600 mb-4'>Try adjusting your filters or search in a different location</p>
                </div>
            </div>
        ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-3'>
                {listing.map((item,index)=>(
                   <ListingCard 
                        key={item.id} 
                        listing={item} 
                        availabilityCount={availabilityMap[item.id] || 0}
                    />
                ))}
            </div>
        )}
    </div>
  )
}

export default Listing