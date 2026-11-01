"use client"
import React, { useCallback, useEffect, useState } from 'react'
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Formik } from 'formik'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { toast } from 'sonner'
import useSupabaseUser from '@/utils/supabase/useUser'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import FileUpload from '../_components/FileUpload'
import { Loader } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function EditListing({ params }) {


    const user = useSupabaseUser();
    const router = useRouter();
    const [listing, setListing] = useState([]);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listingLoading, setListingLoading] = useState(true);
    const [imageUploadKey, setImageUploadKey] = useState(0);
    const verifyUserRecord = useCallback(async () => {
        setListingLoading(true)
        try {
            const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
            const response = await fetch(`/api/listings?id=${encodeURIComponent(params.id)}`, {
                headers,
                cache: 'no-store',
            })
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result?.error || 'Unable to load this listing')
            }

            const data = result?.listings?.[0]
            if (!data) {
                throw new Error('Listing not found or you do not have permission to edit it')
            }

            const { data: imageRows, error: imageError } = await supabase
                .from('listingImages')
                .select('listing_id,url')
                .eq('listing_id', params.id)

            if (!imageError) {
                data.listingImages = imageRows || []
            }
            setListing(data)
        } catch (error) {
            console.error('Unable to load listing for editing:', error)
            toast(error?.message || 'Unable to load this listing')
            router.replace('/user/owner')
        } finally {
            setListingLoading(false)
        }
    }, [params.id, router, user?.user_metadata?.role])

    useEffect(() => {
        let active = true

        if (user?.email) {
            verifyUserRecord()
        } else {
            supabase.auth.getUser().then(({ data, error }) => {
                if (!active) return
                if (error) {
                    console.error('Unable to verify user before editing listing:', error)
                    toast('Please sign in to edit this listing')
                    router.replace('/sign-in')
                } else if (data.user) {
                    verifyUserRecord()
                } else {
                    router.replace('/sign-in')
                }
            }).catch((error) => {
                if (!active) return
                console.error('Unable to verify user before editing listing:', error)
                toast('Please sign in to edit this listing')
                router.replace('/sign-in')
            })
        }

        return () => {
            active = false
        }
    }, [router, user?.email, verifyUserRecord])

    const onSubmitHandler = async (formValue) => {
        const monthlyRent = Number(formValue.price)
        if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
            toast('Enter a monthly rent amount greater than zero.')
            return false
        }

        setLoading(true);

        const supportedUpdateFields = [
            'title',
            'description',
            'price',
            'type',
            'propertyType',
            'bedroom',
            'bathroom',
            'builtIn',
            'parking',
            'lotSize',
            'hoa',
            'createdby',
        ]

        const normalizedValues = {}

        for (const field of supportedUpdateFields) {
            if (field === 'title') {
                const nextValue = String(formValue.title ?? listing?.title ?? '').trim()
                if (nextValue) normalizedValues.title = nextValue
                continue
            }

            if (field === 'description') {
                const nextValue = formValue.description ?? listing?.description ?? ''
                normalizedValues.description = nextValue
                continue
            }

            if (field === 'price') {
                const nextValue = formValue.price ?? listing?.price ?? 0
                normalizedValues.price = Number(nextValue)
                continue
            }

            if (field === 'type') {
                normalizedValues.type = 'Rent'
                continue
            }

            if (field === 'propertyType') {
                const nextValue = formValue.propertyType ?? formValue.propertytype ?? listing?.propertyType ?? 'House'
                normalizedValues.propertyType = nextValue
                continue
            }

            if (field === 'bedroom') {
                if (formValue.bedroom !== undefined && formValue.bedroom !== '') {
                    normalizedValues.bedroom = Number(formValue.bedroom)
                }
                continue
            }

            if (field === 'bathroom') {
                if (formValue.bathroom !== undefined && formValue.bathroom !== '') {
                    normalizedValues.bathroom = Number(formValue.bathroom)
                }
                continue
            }

            if (field === 'builtIn') {
                if (formValue.builtIn !== undefined && formValue.builtIn !== '') {
                    normalizedValues.builtIn = Number(formValue.builtIn)
                }
                continue
            }

            if (field === 'parking') {
                if (formValue.parking !== undefined && formValue.parking !== '') {
                    normalizedValues.parking = Number(formValue.parking)
                }
                continue
            }

            if (field === 'lotSize') {
                if (formValue.lotSize !== undefined && formValue.lotSize !== '') {
                    normalizedValues.lotSize = Number(formValue.lotSize)
                }
                continue
            }

            if (field === 'hoa') {
                if (formValue.hoa !== undefined && formValue.hoa !== '') {
                    normalizedValues.hoa = Number(formValue.hoa)
                }
                continue
            }

            if (field === 'createdby') {
                const nextValue = user?.email || formValue.createdby || listing?.createdby || listing?.createdBy
                if (nextValue) normalizedValues.createdby = nextValue
            }
        }

        try {
            const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
            const response = await fetch('/api/listings', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ id: params.id, ...normalizedValues }),
            })
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result?.error || 'Unable to update listing')
            }

            if (result?.listing) {
                setListing((current) => ({ ...current, ...result.listing }))
            }

            if (images.length) {
                const formData = new FormData()
                Array.from(images).forEach((image) => formData.append('images', image))
                const uploadHeaders = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
                delete uploadHeaders['Content-Type']

                const uploadResponse = await fetch(`/api/listings/${encodeURIComponent(params.id)}/images`, {
                    method: 'POST',
                    headers: uploadHeaders,
                    body: formData,
                })
                const uploadResult = await uploadResponse.json()

                if (!uploadResponse.ok) {
                    throw new Error(uploadResult?.error || 'Unable to upload listing images')
                }

                setListing((current) => ({
                    ...current,
                    listingImages: [...(current?.listingImages || []), ...(uploadResult.images || [])],
                }))
                setImages([])
                setImageUploadKey((current) => current + 1)
            }

            toast('Listing saved.')
            return true
        } catch (error) {
            console.error('Unable to save listing:', error)
            toast(error?.message || 'Unable to save listing')
            return false
        } finally {
            setLoading(false)
        }
    }

    const publishBtnHandler = async (formValues) => {
        const saved = await onSubmitHandler(formValues)
        if (!saved) return

        setLoading(true)
        try {
            const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
            const response = await fetch('/api/listings', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ id: params.id, active: true }),
            })
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result?.error || 'Unable to publish listing')
            }

            toast('Listing published!')
            router.replace(`/view-listing/${encodeURIComponent(params.id)}`)
        } catch (error) {
            console.error('Unable to publish listing:', error)
            toast(error?.message || 'Unable to publish listing')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8'>
            <header className='mb-6 space-y-2'>
                <p className='text-sm font-semibold uppercase tracking-wide text-blue-600'>Step 2 of 2 · Accommodation</p>
                <h2 className='text-3xl font-bold tracking-tight text-slate-900'>Complete your accommodation details</h2>
                <p className='text-slate-600'>Add the monthly rent, room details, and photos students need to make a decision.</p>
            </header>

            {listingLoading ? (
                <p className='mt-6 text-slate-600'>Loading listing details...</p>
            ) : (
            <Formik
                enableReinitialize
                initialValues={{
                    title: listing?.title || '',
                    type: 'Rent',
                    propertyType: listing?.propertyType || 'House',
                    description: listing?.description || '',
                    price: listing?.price ?? 0,
                    bedroom: listing?.bedroom ?? '',
                    bathroom: listing?.bathroom ?? '',
                    builtIn: listing?.builtIn ?? '',
                    parking: listing?.parking ?? '',
                    lotSize: listing?.lotSize ?? '',
                    area: listing?.area ?? '',
                    hoa: listing?.hoa ?? '',
                    profileImage: user?.imageUrl,
                    fullName: user?.fullName
                }}
                onSubmit={(values) => {
                    console.log(values);
                    onSubmitHandler(values);
                }}
            >
                {({
                    values,
                    handleChange,
                    handleSubmit,
                    setFieldValue
                }) => (
                    <form onSubmit={handleSubmit} className='space-y-6'>
                            <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
                                <div className='mb-6'>
                                    <h3 className='text-lg font-semibold text-slate-900'>Overview</h3>
                                    <p className='mt-1 text-sm text-slate-500'>Give your accommodation a clear title and select its type.</p>
                                </div>
                                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='listing-title'>Listing title *</Label>
                                        <Input
                                            id='listing-title'
                                            type="text"
                                            placeholder="e.g. Modern Studio for Students"
                                            name="title"
                                            value={values.title}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='property-type'>Property type</Label>
                                        <Select
                                            value={values.propertyType || 'House'}
                                            onValueChange={(e) => setFieldValue('propertyType', e)}
                                            name="propertyType"
                                        >
                                            <SelectTrigger id='property-type' className="w-full">
                                                <SelectValue placeholder={listing?.propertyType ? listing?.propertyType : "Select Property Type"} />
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
                                    </div>
                                </div>
                            </section>

                            <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
                                <div className='mb-6'>
                                    <h3 className='text-lg font-semibold text-slate-900'>Rooms and property</h3>
                                    <p className='mt-1 text-sm text-slate-500'>Share the key features of the accommodation.</p>
                                </div>
                                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='bedroom'>Bedrooms</Label>
                                        <Input id='bedroom' type="number" min="0" step="1" placeholder="e.g. 2"
                                             value={values.bedroom}
                                             name="bedroom"
                                             onChange={handleChange}
                                        />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='bathroom'>Bathrooms</Label>
                                        <Input id='bathroom' type="number" min="0" step="1" placeholder="e.g. 1" name="bathroom"
                                             onChange={handleChange}
                                             value={values.bathroom} />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='built-in'>Year built</Label>
                                        <Input id='built-in' type="number" min="1800" step="1" placeholder="e.g. 2010"
                                            onChange={handleChange}
                                            value={values.builtIn} name="builtIn" />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='parking'>Parking spaces</Label>
                                        <Input id='parking' type="number" min="0" step="1" placeholder="e.g. 1" name="parking"
                                             onChange={handleChange}
                                             value={values.parking}
                                        />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='lot-size'>Lot size (sq. ft.)</Label>
                                        <Input id='lot-size' type="number" min="0" step="any" placeholder="e.g. 1200" name="lotSize"
                                             onChange={handleChange}
                                             value={values.lotSize} />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='area'>Floor area (sq. ft.)</Label>
                                        <Input id='area' type="number" min="0" step="any" placeholder="e.g. 850" name="area"
                                             onChange={handleChange}
                                             value={values.area} />
                                    </div>
                                </div>
                            </section>

                            <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
                                <div className='mb-6'>
                                    <h3 className='text-lg font-semibold text-slate-900'>Monthly cost</h3>
                                    <p className='mt-1 text-sm text-slate-500'>Set the monthly rent students will pay for this accommodation.</p>
                                </div>
                                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                                    <div className='flex flex-col gap-2'>
                                        <Label htmlFor='monthly-rent'>Monthly rent *</Label>
                                        <div className='relative'>
                                             <span className='pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500'>R</span>
                                             <Input id='monthly-rent' className='pl-8' type="number" min="1" step="1" placeholder="e.g. 4,500" name="price"
                                             onChange={handleChange}
                                             value={values.price} required />
                                        </div>
                                        <p className='text-xs text-slate-500'>Enter the rent for one month.</p>
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <Label htmlFor='hoa'>Additional monthly fees (R)</Label>
                                        <Input id='hoa' type="number" min="0" step="1"
                                             value={values.hoa} placeholder="100" onChange={handleChange}
                                             name="hoa" />
                                    </div>
                                </div>
                            </section>

                            <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
                                <div className='mb-6'>
                                    <h3 className='text-lg font-semibold text-slate-900'>Description and photos</h3>
                                    <p className='mt-1 text-sm text-slate-500'>Help students understand what makes this place a good fit.</p>
                                </div>
                                <div className='flex flex-col gap-2'>
                                        <Label htmlFor='description'>Description</Label>
                                        <Textarea id='description' rows={5} placeholder="Describe the accommodation, included amenities, and nearby transport or campus access." name="description"
                                             onChange={handleChange}
                                             value={values.description} />
                                </div>
                                <div className='mt-6'>
                                    <h3 className='mb-2 text-sm font-medium text-slate-700'>Accommodation photos</h3>
                                    <FileUpload
                                        key={imageUploadKey}
                                        setImages={(value) => setImages(value)}
                                        imageList={listing.listingImages}
                                    />
                                </div>
                                <div className='mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>

                                    <Button type="submit" disabled={loading} variant="outline" className="text-primary border-primary sm:min-w-32">
                                        {loading ? <Loader className='animate-spin' /> : 'Save'}
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button type="button" disabled={loading} className="sm:min-w-40">
                                        {loading ? <Loader className='animate-spin' /> : 'Save & Publish'}
                                    </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Ready to Publish?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                   Do you really want to publish the listing?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={(event) => {
                                                    event.preventDefault()
                                                    publishBtnHandler(values)
                                                }}>
                                                    {loading?<Loader className='animate-spin'/>:'Continue'}
                                                    </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>


                                </div>
                            </section>
                    </form>)}
            </Formik>
            )}
        </div>
    )
}

export default EditListing