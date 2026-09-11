"use client"
import React, { useEffect, useState } from 'react'
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import { usePathname, useRouter } from 'next/navigation'
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
    useEffect(() => {
        console.log(user?.user_metadata?.avatar_url)
        // console.log(params.split('/')[2]);
        user && verifyUserRecord();
    }, [user]);

    const verifyUserRecord = async () => {
        const { data, error } = await supabase
            .from('listings')
            .select('*,listingImages(listing_id,url)')
            .eq('createdby', user?.email)
            .eq('id', params.id);
        if (data) {
            console.log(data)
            setListing(data[0]);
        }
        if (data?.length <= 0) {
            router.replace('/')
        }
    }

    const onSubmitHandler = async (formValue) => {
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
                const nextValue = formValue.type ?? listing?.type ?? 'Rent'
                normalizedValues.type = nextValue
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

        const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'owner')
        const response = await fetch('/api/listings', {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: params.id, ...normalizedValues }),
        })
        const result = await response.json()

        if (!response.ok) {
            console.error('Update listing error:', result)
            toast(result?.error || 'Unable to update listing')
            setLoading(false)
            return
        }

        if (result?.listing) {
            setListing((current) => ({ ...current, ...result.listing }))
            toast('Listing updated and published');
            setLoading(false)
        }
        for (const image of images) {
            setLoading(true)
            try {
                const file = image;
                const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                const fileExt = (file.type || 'image/jpeg').split('/').pop() || 'jpg';
                const { data, error } = await supabase.storage
                    .from('accommodations')
                    .upload(`${fileName}.${fileExt}`, file, {
                        contentType: file.type || `image/${fileExt}`,
                        upsert: false
                    });

                if (error) {
                    console.error('Edit listing image upload error:', error)
                    const isMissingTable = error?.message?.includes('table') || error?.message?.includes('not found') || error?.code === 'PGRST205'
                    if (!isMissingTable) {
                        toast('Error while uploading images')
                    }
                    setLoading(false)
                    continue
                }

                const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/accommodations/${fileName}.${fileExt}`;
                const { data: insertData, error: insertError } = await supabase
                    .from('listingImages')
                    .insert([
                        { url: imageUrl, listing_id: params?.id }
                    ])
                    .select();

                if (insertData) {
                    setLoading(false);
                }
                if (insertError) {
                    console.error('Edit listing image insert error:', insertError)
                    const isMissingTable = insertError?.message?.includes('table') || insertError?.message?.includes('not found') || insertError?.code === 'PGRST205'
                    if (!isMissingTable) {
                        toast('Error saving image reference')
                    }
                    setLoading(false)
                }
            } catch (imgError) {
                console.error('Edit listing image processing error:', imgError)
                setLoading(false)
            }
            setLoading(false);
        }

    }

    const publishBtnHandler=async()=>{
        setLoading(true)
        const { data, error } = await supabase
        .from('listings')
        .update({ active: true })
        .eq('id', params?.id)
        .select()

        if(data)
        {
            setLoading(false)
            toast('Listing published!')
        }
        
    }

    return (
        <div className='px-10 md:px-36 my-10'>
            <h2 className='font-bold text-2xl'>Enter some more details about your listing</h2>

            <Formik
                enableReinitialize
                initialValues={{
                    title: listing?.title || '',
                    type: listing?.type || 'Rent',
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
                    <form onSubmit={handleSubmit}>
                        <div>
                            <div className='p-5 border rounded-lg shadow-md grid gap-7 mt-6'>
                                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10'>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Listing title</h2>
                                        <Input
                                            type="text"
                                            placeholder="e.g. Modern Studio for Students"
                                            name="title"
                                            value={values.title}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Do you want to Rent it Sell it?</h2>
                                        <RadioGroup
                                            value={values.type || 'Rent'}
                                            onValueChange={(v) => setFieldValue('type', v)}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Sell" id="Sell" />
                                                <Label htmlFor="Sell" className="text-lg">Sell</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Rent" id="Rent" />
                                                <Label htmlFor="Rent" className="text-lg">Rent</Label>
                                            </div>
                                        </RadioGroup>

                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Property Type</h2>
                                        <Select
                                            value={values.propertyType || 'House'}
                                            onValueChange={(e) => setFieldValue('propertyType', e)}
                                            name="propertyType"
                                        >
                                            <SelectTrigger className="w-[180px]">
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
                                <div className='grid  grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10'>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Bedroom</h2>
                                        <Input type="number" placeholder="Ex.2"
                                            value={values.bedroom}
                                            name="bedroom"
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'   >Bathroom</h2>
                                        <Input type="number" placeholder="Ex.2" name="bathroom"
                                            onChange={handleChange}
                                            value={values.bathroom} />
                                    </div>
                                    <div className='flex gap-2 flex-col'   >
                                        <h2 className='text-gray-500'>Built In</h2>
                                        <Input type="number" placeholder="Ex.1900 Sq.ft"
                                            onChange={handleChange}
                                            value={values.builtIn} name="builtIn" />
                                    </div>

                                </div>
                                <div className='grid  grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10'>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Parking</h2>
                                        <Input type="number" placeholder="Ex.2" name="parking"
                                            onChange={handleChange}
                                            value={values.parking}
                                        />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Lot Size (Sq.Ft)</h2>
                                        <Input type="number" placeholder="" name="lotSize"
                                            onChange={handleChange}
                                            value={values.lotSize} />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Area (Sq.Ft)</h2>
                                        <Input type="number" placeholder="Ex.1900" name="area"
                                            onChange={handleChange}
                                            value={values.area} />
                                    </div>

                                </div>
                                <div className='grid  grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10'>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Selling Price (R)</h2>
                                        <Input type="number" placeholder="400000" name="price"
                                            onChange={handleChange}
                                            value={values.price} />
                                    </div>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>HOA (Per Month) (R)</h2>
                                        <Input type="number"
                                            value={values.hoa} placeholder="100" onChange={handleChange}
                                            name="hoa" />
                                    </div>


                                </div>
                                <div className='grid  grid-cols-1  gap-10'>
                                    <div className='flex gap-2 flex-col'>
                                        <h2 className='text-gray-500'>Description</h2>
                                        <Textarea placeholder="" name="description"
                                            onChange={handleChange}
                                            value={values.description} />
                                    </div>
                                </div>
                                <div>
                                    <h2 className='font-lg text-gray-500 my-2'>Upload Property Images</h2>
                                    <FileUpload
                                        setImages={(value) => setImages(value)}
                                        imageList={listing.listingImages}
                                    />
                                </div>
                                <div className='flex gap-7 justify-end'>

                                    <Button type="submit" disabled={loading} variant="outline" className="text-primary border-primary">
                                        {loading ? <Loader className='animate-spin' /> : 'Save'}
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button type="button" disabled={loading} className="">
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
                                                <AlertDialogAction onClick={()=>publishBtnHandler()} >
                                                    {loading?<Loader className='animate-spin'/>:'Continue'}
                                                    </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>


                                </div>
                            </div>
                        </div>
                    </form>)}
            </Formik>
        </div>
    )
}

export default EditListing