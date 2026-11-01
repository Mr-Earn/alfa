"use client"
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
    const [manualAddress, setManualAddress] = useState('')
    const [propertyType, setPropertyType] = useState('House')
    const user = useSupabaseUser()
    const [loader, setLoader] = useState(false)
    const router = useRouter()

    const nextHandler = async () => {
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
        const controller = new AbortController()
        let timeoutId

        try {
            const timeout = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    controller.abort()
                    const error = new Error('Listing request timed out')
                    error.name = 'TimeoutError'
                    reject(error)
                }, 30000)
            })
            const headers = await Promise.race([
                getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner'),
                timeout,
            ])
            const response = await fetch('/api/listings', {
                method: 'POST',
                headers,
                signal: controller.signal,
                body: JSON.stringify({
                    address: addressValue,
                    title: `Property at ${addressValue}`,
                    type: 'Rent',
                    propertyType: propertyType,
                    bedroom: 1,
                    price: 0,
                    createdby: user.email,
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
            toast(['AbortError', 'TimeoutError'].includes(error?.name)
                ? 'Saving took too long. Check My Listings before trying again.'
                : error?.message || 'Unable to save listing')
        } finally {
            clearTimeout(timeoutId)
            setLoader(false)
        }
    }

    return (
        <div className='mx-auto mt-8 w-full max-w-3xl px-4 pb-10 sm:px-6 lg:mt-12'>
            <header className='mb-6 space-y-2'>
                <p className='text-sm font-semibold uppercase tracking-wide text-blue-600'>Step 1 of 2 · Accommodation</p>
                <h2 className='text-3xl font-bold tracking-tight text-slate-900'>Create an accommodation listing</h2>
                <p className='text-slate-600'>Start with the property address and type. You can add rent and room details in the next step.</p>
            </header>
            <div className='flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
                <div>
                    <h3 className='text-lg font-semibold text-slate-900'>Property details</h3>
                    <p className='mt-1 text-sm text-slate-500'>Fields marked with * are required.</p>
                </div>

                    <div className='flex flex-col gap-2'>
                        <label htmlFor='property-address' className='text-sm font-medium text-slate-700'>Property address *</label>
                        <input
                            id='property-address'
                            type='text'
                            autoComplete='street-address'
                            required
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder='Enter full property address'
                            className='w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                        <p className='text-xs text-slate-500'>Use the full address so students can find the accommodation.</p>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label htmlFor='property-type' className='text-sm font-medium text-slate-700'>Property type *</label>
                        <Select value={propertyType} onValueChange={setPropertyType}>
                            <SelectTrigger id='property-type' className="w-full">
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
                        <p className='text-xs text-slate-500'>Choose the type that best describes this accommodation.</p>
                    </div>

                    <Button
                        className='w-full sm:w-auto sm:self-end'
                        disabled={!manualAddress.trim() || loader}
                        onClick={nextHandler}
                    >
                        {loader ? <><Loader className='mr-2 animate-spin' />Saving listing...</> : 'Save and continue'}
                    </Button>
            </div>
        </div>
    )
}

export default AddNewListing