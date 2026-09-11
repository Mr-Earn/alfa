"use client"
import GoogleAddressSearch from '@/app/_components/GoogleAddressSearch'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import useSupabaseUser from '@/utils/supabase/useUser'
import { Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'

function AddNewListing() {
    const [selectedAddress, setSelectedAddress] = useState('')
    const [manualAddress, setManualAddress] = useState('')
    const [propertyType, setPropertyType] = useState('House')
    const [coordinates, setCoordinates] = useState(null)
    const user = useSupabaseUser()
    const [loader, setLoader] = useState(false)
    const router = useRouter()

    const handleGoogleAddressChange = (value) => {
        setSelectedAddress(value)
        // If Google address is selected, it becomes the primary address
        if (value) {
            setManualAddress(value)
        }
    }

    const nextHandler = async () => {
        // Use manual address field - it can be filled directly or via Google autofill
        const addressValue = String(manualAddress || '').trim()

        if (!addressValue) {
            toast('Please enter an address first')
            return
        }

        if (!user?.email) {
            toast('Please sign in to add a listing')
            return
        }

        setLoader(true)

        try {
            const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
            const response = await fetch('/api/listings', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    address: addressValue,
                    title: `Property at ${addressValue}`,
                    propertyType: propertyType,
                    bedroom: 1,
                    price: 0,
                    createdby: user.email,
                    coordinates,
                }),
            })

            const json = await response.json()

            if (!response.ok) {
                throw new Error(json?.error || 'Unable to create listing')
            }

            const listingId = json?.listing?.id
            if (!listingId) {
                throw new Error('Listing was created without an id')
            }

            toast('Listing saved. Add the property details next.')
            router.replace(`/edit-listing/${listingId}`)
        } catch (error) {
            console.error('Add listing failed', error)
            toast(error?.message || 'Server side error')
        } finally {
            setLoader(false)
        }
    }

    return (
        <div className='mt-10 md:mx-56 lg:mx-80'>
            <div className='flex flex-col gap-5 items-center justify-center p-10'>
                <h2 className='text-3xl font-bold'>Add New Listing</h2>
                <div className='w-full rounded-lg border border-slate-200 p-10 shadow-md flex flex-col gap-5'>
                    <h2 className='text-lg text-gray-500'>Enter the address you want to list</h2>
                    
                    {/* Manual Address Input - Required */}
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-slate-700'>Property Address *</label>
                        <input
                            type='text'
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder='Enter full property address'
                            className='w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                        <p className='text-xs text-slate-500'>Required. You can type the address directly or use Google autofill below.</p>
                    </div>

                    {/* Property Type - Required */}
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-slate-700'>Property Type *</label>
                        <Select value={propertyType} onValueChange={setPropertyType}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Property Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="House">House</SelectItem>
                                <SelectItem value="Single Family House">Single Family House</SelectItem>
                                <SelectItem value="Town House">Town House</SelectItem>
                                <SelectItem value="Apartment">Apartment</SelectItem>
                                <SelectItem value="Studio">Studio</SelectItem>
                                <SelectItem value="Condo">Condo</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className='text-xs text-slate-500'>Select the type of property you want to list.</p>
                    </div>

                    {/* Google Autofill - Optional */}
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-slate-700'>Search with Google Maps (Optional)</label>
                        <GoogleAddressSearch
                            value={selectedAddress}
                            onChange={handleGoogleAddressChange}
                            setCoordinates={setCoordinates}
                        />
                        <p className='text-xs text-slate-500'>Use this to autofill the address above and get coordinates.</p>
                    </div>

                    <Button
                        disabled={!manualAddress || loader}
                        onClick={nextHandler}
                    >
                        {loader ? <Loader className='animate-spin' /> : 'Save and continue'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default AddNewListing