"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSupabaseUser from '@/utils/supabase/useUser'
import { supabase } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Search, Plus, Camera, Video, Tag, DollarSign, Sparkles } from 'lucide-react'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { toast } from 'sonner'

const emptyForm = {
  title: '',
  description: '',
  price: '',
  mediaType: 'image',
  mediaUrl: '',
}

const normalizeItem = (item) => ({
  id: item?.id || Date.now(),
  title: item?.title || 'Untitled item',
  description: item?.description || 'No description provided.',
  price: item?.price || 'Free',
  tag: item?.tag || (item?.media_type === 'video' ? 'Video listing' : 'Student listing'),
  mediaType: item?.media_type || item?.mediaType || 'image',
  mediaUrl: item?.media_url || item?.mediaUrl || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  seller: item?.seller_name || item?.seller || 'Student seller',
  sellerEmail: item?.seller_email || item?.sellerEmail || '',
  createdAt: item?.created_at || item?.createdAt || new Date().toISOString(),
})

const uploadMarketplaceFile = async (file) => {
  if (!file || !supabase?.storage) return null

  const bucket = 'marketplace-items'
  const safeName = (file.name || `marketplace-${Date.now()}`).replace(/\s+/g, '-')
  const path = `marketplace/${Date.now()}-${safeName}`

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
    })

    if (error) throw error

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return publicData?.publicUrl || null
  } catch (error) {
    console.warn('Marketplace file upload failed; falling back to preview URL.', error)
    return null
  }
}

export default function MarketplacePage() {
  const user = useSupabaseUser()
  const role = user?.user_metadata?.role ?? 'student'
  const router = useRouter()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadItems = async () => {
      if (!user?.email) {
        setItems([])
        return
      }

      try {
        setLoading(true)
        const headers = await getAuthenticatedRequestHeaders(role)
        const res = await fetch('/api/marketplace', { headers })
        const data = await res.json()
        if (res.ok) {
          setItems(Array.isArray(data?.items) ? data.items.map(normalizeItem) : [])
        }
      } catch (err) {
        console.warn('Unable to load marketplace items', err)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [user?.email, role])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items

    return items.filter((item) => {
      const haystack = [item.title, item.description, item.tag, item.seller].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [items, search])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedTitle = form.title.trim()
    const trimmedDescription = form.description.trim()
    if (!trimmedTitle || !trimmedDescription) {
      toast('Please enter item name and description')
      return
    }

    try {
      setSubmitting(true)
      const headers = await getAuthenticatedRequestHeaders(role)
      const payload = {
        title: trimmedTitle,
        description: trimmedDescription,
        price: form.price ? `R${Number(form.price).toFixed(0)}` : 'Free',
        media_type: form.mediaType,
        media_url: form.mediaUrl || (form.mediaType === 'video' ? 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' : 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'),
        seller_name: user?.user_metadata?.full_name || user?.email || 'Student seller',
        seller_email: user?.email || null,
      }

      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { ...(headers), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to post item')
      }

      const nextItem = normalizeItem(data?.item || payload)
      setItems((prev) => [nextItem, ...prev])
      setForm(emptyForm)
      setShowForm(false)
      toast('Item posted successfully!')
    } catch (err) {
      console.error('Unable to create marketplace item', err)
      toast(err?.message || 'Failed to post item. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    const uploadedUrl = await uploadMarketplaceFile(file)

    setForm((prev) => ({
      ...prev,
      mediaUrl: uploadedUrl || preview,
      mediaType: file.type.startsWith('video/') ? 'video' : 'image',
    }))
  }

  const handleContactSeller = async (item) => {
    if (!user?.email) {
      toast('Please sign in to contact the seller.')
      return
    }

    const sellerEmail = String(item?.sellerEmail || item?.seller_email || item?.seller || '').trim()
    const itemTitle = item?.title || 'this item'

    if (!sellerEmail || sellerEmail.toLowerCase() === user.email.toLowerCase()) {
      toast('This listing is not available for direct contact.')
      return
    }

    try {
      const headers = await getAuthenticatedRequestHeaders(role)
      const messageBody = `Hi ${item?.seller || 'seller'}, I'm interested in buying "${itemTitle}". Please share more details.`

      await fetch('/api/messages', {
        method: 'POST',
        headers: { ...(headers), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: messageBody,
          recipient: sellerEmail,
          recipient_name: item?.seller || sellerEmail,
        }),
      })
    } catch (err) {
      console.warn('Unable to create seller contact message', err)
    }

    const params = new URLSearchParams({ seller: sellerEmail, item: itemTitle })
    router.push(`/user/messages?${params.toString()}`)
  }

  if (role !== 'student') {
    return (
      <div className='p-6'>
        <h3 className='text-lg font-semibold'>Marketplace</h3>
        <p className='mt-2 text-sm text-slate-600'>Marketplace is visible to signed-in students only.</p>
      </div>
    )
  }

  return (
    <div className='p-4 md:p-6'>
      <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h3 className='text-2xl font-bold text-slate-900'>Student marketplace</h3>
          <p className='mt-1 text-sm text-slate-500'>Buy, sell and share items with your campus community.</p>
        </div>

        <Button onClick={() => setShowForm((prev) => !prev)} className='rounded-full bg-emerald-600 hover:bg-emerald-700'>
          <Plus className='mr-2 h-4 w-4' />
          {showForm ? 'Close form' : 'Post an item'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className='mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-6'>
          <div className='mb-5 flex items-center gap-2'>
            <Sparkles className='h-5 w-5 text-emerald-600' />
            <h4 className='text-lg font-semibold text-slate-900'>Create a marketplace post</h4>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='md:col-span-2'>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Item name</label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder='e.g. Study desk chair'
                className='w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-0 transition focus:border-emerald-500 focus:bg-white'
              />
            </div>

            <div className='md:col-span-2'>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Description</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                placeholder='Tell students what makes this item useful and in what condition it is.'
                className='w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white'
              />
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Price (optional)</label>
              <div className='relative'>
                <DollarSign className='pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400' />
                <input
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                  type='number'
                  min='0'
                  placeholder='0'
                  className='w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white'
                />
              </div>
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Media type</label>
              <select
                value={form.mediaType}
                onChange={(event) => setForm((prev) => ({ ...prev, mediaType: event.target.value }))}
                className='w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white'
              >
                <option value='image'>Image</option>
                <option value='video'>Video</option>
              </select>
            </div>

            <div className='md:col-span-2'>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Image or video URL (optional)</label>
              <input
                value={form.mediaUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                placeholder='https://example.com/image.jpg or mp4 link'
                className='w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white'
              />
            </div>

            <div className='md:col-span-2'>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Upload file</label>
              <div className='flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3'>
                <label className='inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700'>
                  {form.mediaType === 'video' ? <Video className='h-4 w-4' /> : <Camera className='h-4 w-4' />}
                  Choose file
                  <input type='file' accept={form.mediaType === 'video' ? 'video/*' : 'image/*'} className='hidden' onChange={handleFileSelect} />
                </label>
                <span className='text-xs text-slate-500'>PNG, JPG, GIF or MP4 supported</span>
              </div>
            </div>
          </div>

          <div className='mt-5 flex justify-end'>
            <Button type='submit' disabled={submitting} className='rounded-full bg-emerald-600 hover:bg-emerald-700'>
              {submitting ? 'Posting...' : 'Post item'}
            </Button>
          </div>
        </form>
      )}

      <div className='mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
        <Search className='h-4 w-4 text-slate-400' />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search marketplace items'
          className='w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none'
        />
      </div>

      {loading && (
        <div className='mb-4 text-sm text-slate-500'>Loading marketplace items...</div>
      )}

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {filteredItems.map((item) => (
          <article key={item.id} className='group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg'>
            <div className='relative h-56 overflow-hidden bg-slate-100'>
              {item.mediaType === 'video' ? (
                <video src={item.mediaUrl} controls className='h-full w-full object-cover' />
              ) : (
                <img src={item.mediaUrl} alt={item.title} className='h-full w-full object-cover transition duration-300 group-hover:scale-105' />
              )}

              <div className='absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 backdrop-blur-sm'>
                <Tag className='h-3 w-3' />
                {item.tag}
              </div>

              <div className='absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white'>
                {item.price}
              </div>
            </div>

            <div className='space-y-3 p-4'>
              <div>
                <h4 className='text-lg font-semibold text-slate-900'>{item.title}</h4>
                <p className='mt-1 text-xs font-medium uppercase tracking-wide text-slate-400'>By {item.seller}</p>
              </div>

              <p className='line-clamp-3 text-sm leading-6 text-slate-600'>{item.description}</p>

              <div className='flex items-center justify-between pt-2'>
                <span className='text-xs text-slate-400'>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Fresh listing'}</span>
                <Button variant='outline' size='sm' className='rounded-full' onClick={() => handleContactSeller(item)}>Contact seller</Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredItems.length === 0 && !loading && (
        <div className='mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center'>
          <Search className='mx-auto mb-3 h-8 w-8 text-slate-300' />
          <p className='text-lg font-medium text-slate-700'>No items match your search</p>
          <p className='mt-1 text-sm text-slate-500'>Try another keyword or post a fresh item for the campus community.</p>
        </div>
      )}
    </div>
  )
}
