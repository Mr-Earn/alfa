"use client"

import React, { useState } from 'react'
import { toast } from 'sonner'
import useSupabaseUser from '@/utils/supabase/useUser'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { X } from 'lucide-react'

export default function MessageModal({ isOpen, onClose, ownerEmail, ownerName, listingTitle }) {
  const user = useSupabaseUser()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async () => {
    const trimmed = message.trim()

    if (!trimmed) {
      toast.error('Please enter a message')
      return
    }

    if (!user?.email) {
      toast.error('Please sign in to send a message')
      return
    }

    if (!ownerEmail) {
      toast.error('Owner email not available')
      return
    }

    setLoading(true)
    try {
      const headers = await getAuthenticatedRequestHeaders(user?.user_metadata?.role || 'student')
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: trimmed,
          recipient: ownerEmail,
          recipient_name: ownerName || ownerEmail,
          listing_title: listingTitle,
        }),
      })

      if (res.ok) {
        toast.success('Message sent to the owner!')
        setMessage('')
        onClose()
        return
      }

      const data = await res.json()
      toast.error(data.error || 'Failed to send message')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
      <div className='w-full max-w-md rounded-2xl bg-white shadow-lg'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-slate-200 px-6 py-4'>
          <h2 className='text-lg font-semibold text-slate-900'>Send Message</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className='text-slate-500 hover:text-slate-700 disabled:opacity-50'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Body */}
        <div className='px-6 py-4'>
          <div className='mb-4'>
            <p className='text-sm text-slate-600'>
              Messaging <span className='font-semibold'>{ownerName || ownerEmail}</span>
            </p>
            {listingTitle && (
              <p className='mt-1 text-xs text-slate-500'>About: {listingTitle}</p>
            )}
          </div>

          <label className='block text-sm font-medium text-slate-700'>Your message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Type your message here...'
            disabled={loading}
            className='mt-2 block w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50'
            rows={5}
          />
          <p className='mt-2 text-xs text-slate-500'>The owner will be notified and can reply in the Messages section.</p>
        </div>

        {/* Footer */}
        <div className='flex gap-3 border-t border-slate-200 px-6 py-4'>
          <button
            onClick={onClose}
            disabled={loading}
            className='flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            onClick={handleSendMessage}
            disabled={loading || !message.trim()}
            className='flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400'
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  )
}
