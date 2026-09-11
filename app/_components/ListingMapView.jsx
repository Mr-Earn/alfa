"use client"
import React, { useEffect, useState } from 'react'
import Listing from './Listing'
import { supabase } from '@/utils/supabase/client'
import { toast } from 'sonner';
import GoogleMapSection from './GoogleMapSection';

function ListingMapView({type}) {

    const [listing,setListing]=useState([]);
    const [availabilityMap,setAvailabilityMap]=useState({});
    const [searchedAddress,setSearchedAddress]=useState();
    const [bedCount,setBedCount]=useState(0);
    const [bathCount,setBathCount]=useState(0);
    const [parkingCount,setParkingCount]=useState(0);
    const [homeType,setHomeType]=useState();
    const [coordinates,setCoordinates]=useState();



    useEffect(()=>{
        getLatestListing();
    },[])

    const getLatestListing=async()=>{
        try {
            console.log('Fetching listings for type:', type);
            const response = await fetch(`/api/listings-public?type=${type}`);
            
            if (!response.ok) {
                console.error('API error:', response.status);
                toast('Error loading listings')
                return;
            }

            const { listings } = await response.json();

            console.log('Listings fetched successfully:', listings?.length, 'items');
            if(listings)
            {
                setListing(listings);
                fetchAvailabilityForListings(listings);
            }
        } catch (err) {
            console.error('Unexpected error fetching listings:', err);
            toast('Server Side Error')
        }
    }

    const fetchAvailabilityForListings=async(listings=[])=>{
        const listingIds = listings.map(item=>item.id).filter(Boolean)
        if(!listingIds.length){
            setAvailabilityMap({})
            return
        }

        const {data,error}=await supabase
        .from('bookings')
        .select('listing_id')
        .in('listing_id', listingIds)

        if(data){
            const counts = {}
            data.forEach((item)=>{
                counts[item.listing_id] = (counts[item.listing_id] || 0) + 1
            })

            const nextAvailability = {}
            listings.forEach((item)=>{
                const totalRooms = Number(item.bedroom || 1)
                const bookedRooms = counts[item.id] || 0
                nextAvailability[item.id] = Math.max(totalRooms - bookedRooms, 0)
            })
            setAvailabilityMap(nextAvailability)
        }

        if(error){
            console.warn('Unable to fetch availability', error)
        }
    }

    const handleSearchClick=async()=>{
        try {
            console.log('Search Address:', searchedAddress);
            const searchTerm = searchedAddress?.label || searchedAddress?.value || ''
            
            // Build API URL with query parameters
            const params = new URLSearchParams();
            params.append('type', type);
            if(searchTerm) params.append('address', searchTerm);
            if(bedCount > 0) params.append('bedroom', bedCount);
            if(bathCount > 0) params.append('bathroom', bathCount);
            if(parkingCount > 0) params.append('parking', parkingCount);
            if(homeType) params.append('homeType', homeType);

            console.log('Search URL:', `/api/listings-public?${params.toString()}`);
            const response = await fetch(`/api/listings-public?${params.toString()}`);
            const { listings } = await response.json();
            
            console.log('Search results:', listings?.length);
            if(listings) {
                setListing(listings);
                fetchAvailabilityForListings(listings);
            }
        } catch(err) {
            console.error('Search error:', err);
            toast('Error searching listings');
        }
    }
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <div>
            <Listing listing={listing}
            availabilityMap={availabilityMap}
            handleSearchClick={handleSearchClick}
            searchedAddress={(v)=>setSearchedAddress(v)}
            setBathCount={setBathCount}
            setBedCount={setBedCount}
            setParkingCount={setParkingCount}
            setHomeType={setHomeType}
            setCoordinates={setCoordinates}
            />
        </div>
        <div className='fixed right-10 h-full 
        md:w-[350px] lg:w-[450px] xl:w-[650px]'>
            <GoogleMapSection
            listing={listing}
            coordinates={coordinates}
            />
        </div>
    </div>
  )
}

export default ListingMapView