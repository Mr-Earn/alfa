"use client"

import React, { useEffect, useMemo, useState } from 'react'
import useSupabaseUser from '@/utils/supabase/useUser'
import { supabase } from '@/utils/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAuthenticatedRequestHeaders } from '@/lib/permissions'
import { MoreHorizontal, Search, Send, MessageSquareText } from 'lucide-react'

const formatMessageTime = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const getThreadName = (message, currentUserEmail, fallbackEmail) => {
  const sender = (message?.sender || '').toLowerCase()
  const recipient = (message?.recipient || '').toLowerCase()

  if (sender === currentUserEmail) {
    return message?.recipient_name || message?.recipient || fallbackEmail || 'Chat'
  }

  return message?.sender_name || message?.sender || fallbackEmail || 'Chat'
}

export default function MessagesPage() {
  const user = useSupabaseUser()
  const role = user?.user_metadata?.role ?? 'student'
  const [messages, setMessages] = useState([])
  const [leaseRequests, setLeaseRequests] = useState([])
  const [draft, setDraft] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeContact, setActiveContact] = useState('')
  const [marketplaceLead, setMarketplaceLead] = useState({ email: '', item: '' })

  const currentUserEmail = (user?.email || '').toLowerCase()

  const threads = useMemo(() => {
    const byContact = new Map()

    for (const message of messages) {
      const messageSender = (message?.sender || '').toLowerCase()
      const messageRecipient = (message?.recipient || '').toLowerCase()
      const contactEmail = messageSender === currentUserEmail ? (messageRecipient || 'unknown') : (messageSender || 'unknown')

      if (!contactEmail || contactEmail === 'unknown') continue

      const existing = byContact.get(contactEmail) || {
        email: contactEmail,
        name: getThreadName(message, currentUserEmail, contactEmail),
        messages: [],
      }

      existing.messages.push(message)
      existing.name = existing.name || getThreadName(message, currentUserEmail, contactEmail)
      byContact.set(contactEmail, existing)
    }

    return [...byContact.values()].sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.created_at || 0
      const bLast = b.messages[b.messages.length - 1]?.created_at || 0
      return new Date(bLast).getTime() - new Date(aLast).getTime()
    })
  }, [messages, currentUserEmail])

  const filteredThreads = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    if (!search) return threads

    return threads.filter((thread) => {
      const haystack = [thread.email, thread.name, ...thread.messages.map((message) => message.body || '')].join(' ').toLowerCase()
      return haystack.includes(search)
    })
  }, [threads, searchTerm])

  const activeThread = filteredThreads.find((thread) => thread.email === activeContact)
    || (marketplaceLead.email ? { email: marketplaceLead.email, name: marketplaceLead.email, messages: [] } : null)
    || filteredThreads[0]
    || null
  const activeLeaseRequest = useMemo(() => {
    if (!activeThread?.email) return null

    return leaseRequests.find((request) => {
      const ownerEmail = String(request?.owner_email || '').toLowerCase()
      const studentEmail = String(request?.student_email || '').toLowerCase()
      const threadEmail = String(activeThread.email || '').toLowerCase()

      return ownerEmail === threadEmail || studentEmail === threadEmail
    }) || null
  }, [activeThread, leaseRequests])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sellerEmail = params.get('seller') || params.get('recipient') || ''
    const itemTitle = params.get('item') || ''

    if (sellerEmail) {
      setMarketplaceLead({ email: sellerEmail, item: itemTitle })
      setActiveContact(sellerEmail)
    }
  }, [])

  useEffect(() => {
    if (!filteredThreads.length) {
      setActiveContact(marketplaceLead.email || '')
      return
    }

    if (!activeContact || !filteredThreads.some((thread) => thread.email === activeContact)) {
      setActiveContact(marketplaceLead.email || filteredThreads[0].email)
    }
  }, [filteredThreads, activeContact, marketplaceLead.email])

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await getAuthenticatedRequestHeaders(role)
        const res = await fetch('/api/messages', { headers })
        const data = await res.json()
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
      } catch (err) {
        console.warn('Failed to load messages', err)
        setMessages([])
      }
    }

    const loadLeaseRequests = async () => {
      try {
        const headers = await getAuthenticatedRequestHeaders(role)
        const res = await fetch('/api/lease-requests', { headers })
        const data = await res.json()
        setLeaseRequests(Array.isArray(data?.requests) ? data.requests : [])
      } catch (err) {
        console.warn('Failed to load lease requests', err)
        setLeaseRequests([])
      }
    }

    load()
    loadLeaseRequests()
  }, [role])

  useEffect(() => {
    if (!supabase || !user?.email) return

    try {
      const email = (user.email || '').toLowerCase()
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new || payload.record || payload
          const sender = (newMsg.sender || '').toLowerCase()
          const recipientEmail = (newMsg.recipient || '').toLowerCase()

          if (sender === email || recipientEmail === email) {
            setMessages((prev) => [newMsg, ...(prev || [])])
          }
        })
        .subscribe()

      return () => {
        try {
          if (channel && channel.unsubscribe) channel.unsubscribe()
        } catch (err) {
          // ignore
        }
      }
    } catch (e) {
      // ignore realtime errors
    }
  }, [user?.email])

  const sendMessage = async (event) => {
    event.preventDefault()
    const trimmed = draft.trim()
    const targetEmail = activeThread?.email || marketplaceLead.email

    if (!trimmed || !targetEmail) return

    const finalMessage = marketplaceLead.item && !trimmed.toLowerCase().includes(marketplaceLead.item.toLowerCase())
      ? `Hi, I'm interested in buying "${marketplaceLead.item}". ${trimmed}`
      : trimmed

    try {
      const headers = await getAuthenticatedRequestHeaders(role)
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { ...(headers), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: finalMessage,
          recipient: targetEmail,
          recipient_name: activeThread?.name || marketplaceLead.email || targetEmail,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
        setDraft('')
        setMarketplaceLead({ email: '', item: '' })
        return
      }
    } catch (err) {
      console.warn('Failed to send message', err)
    }

    setMessages((prev) => [{
      id: Date.now(),
      sender: user?.email,
      sender_name: user?.user_metadata?.full_name || user?.email || 'You',
      recipient: targetEmail,
      recipient_name: activeThread?.name || marketplaceLead.email || targetEmail,
      body: finalMessage,
      created_at: new Date().toISOString(),
    }, ...(Array.isArray(prev) ? prev : [])])
    setDraft('')
    setMarketplaceLead({ email: '', item: '' })
  }

  return (
    <div className='p-3 md:p-6'>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='text-xl font-semibold text-slate-900'>Messages</h3>
          <p className='mt-1 text-sm text-slate-500'>Send and receive messages with students, owners, universities, and support.</p>
        </div>
      </div>

      <div className='overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm'>
        <div className='grid min-h-[70vh] grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]'>
          <aside className='border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r'>
            <div className='border-b border-slate-200 bg-white p-3'>
              <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500'>
                <Search className='h-4 w-4' />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder='Search chats'
                  className='w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none'
                />
              </div>
            </div>

            <div className='max-h-[70vh] overflow-y-auto'>
              {filteredThreads.length === 0 ? (
                <div className='p-6 text-sm text-slate-500'>No chats match your search.</div>
              ) : (
                filteredThreads.map((thread) => {
                  const lastMessage = [...thread.messages].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]
                  const isActive = activeThread?.email === thread.email

                  return (
                    <button
                      key={thread.email}
                      type='button'
                      onClick={() => setActiveContact(thread.email)}
                      className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left transition ${isActive ? 'bg-emerald-50' : 'bg-transparent hover:bg-slate-100'}`}
                    >
                      <div className='flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-semibold text-white'>
                        {(thread.name || thread.email).charAt(0).toUpperCase()}
                      </div>

                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-2'>
                          <span className='truncate text-sm font-semibold text-slate-900'>{thread.name || thread.email}</span>
                          <span className='text-[10px] text-slate-400'>{formatMessageTime(lastMessage?.created_at)}</span>
                        </div>
                        <p className='truncate text-xs text-slate-500'>
                          {(lastMessage?.sender || '').toLowerCase() === currentUserEmail ? 'You: ' : ''}
                          {lastMessage?.body || 'No message yet'}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <main className='flex min-h-[70vh] flex-col bg-slate-50'>
            {activeThread ? (
              <>
                <header className='flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-white'>
                      {(activeThread.name || activeThread.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className='text-sm font-semibold text-slate-900'>{activeThread.name || activeThread.email}</div>
                      <div className='text-xs text-slate-500'>{activeThread.email}</div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2 text-slate-500'>
                    <MessageSquareText className='h-4 w-4' />
                    <MoreHorizontal className='h-4 w-4' />
                  </div>
                </header>

                {activeLeaseRequest && (
                  <div className='border-b border-slate-200 bg-white px-4 py-3'>
                    <div className='flex items-start justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3'>
                      <div>
                        <p className='text-xs font-semibold uppercase tracking-wide text-indigo-700'>Lease agreement</p>
                        <p className='mt-1 text-sm font-medium text-slate-900'>{activeLeaseRequest.listing_title || 'Lease request'}</p>
                        <p className='mt-1 text-xs text-slate-600'>Status: {activeLeaseRequest.status || 'Pending'}</p>
                      </div>

                      {activeLeaseRequest.lease_url ? (
                        <a
                          href={activeLeaseRequest.lease_url}
                          target='_blank'
                          rel='noreferrer'
                          className='rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700'
                        >
                          View agreement
                        </a>
                      ) : (
                        <span className='rounded-full bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700'>Awaiting upload</span>
                      )}
                    </div>
                  </div>
                )}

                <div className='flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_#f8fafc,_#f1f5f9_48%,_#e2e8f0)] p-4'>
                  {[...activeThread.messages].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()).map((message) => {
                    const isMine = (message.sender || '').toLowerCase() === currentUserEmail

                    return (
                      <div key={`${message.id}-${message.created_at || Math.random()}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isMine ? 'rounded-br-md bg-emerald-500 text-white' : 'rounded-bl-md bg-white text-slate-700'}`}>
                          <p className='text-sm leading-relaxed'>{message.body}</p>
                          <div className={`mt-1 text-[10px] ${isMine ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {formatMessageTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <form onSubmit={sendMessage} className='border-t border-slate-200 bg-white p-3'>
                  <div className='flex items-center gap-2'>
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={`Message ${activeThread.name || activeThread.email}`}
                      className='flex-1 rounded-full border-slate-200 bg-slate-50 px-4 py-2 text-sm'
                    />
                    <Button type='submit' className='rounded-full bg-emerald-500 px-4 hover:bg-emerald-600'>
                      <Send className='h-4 w-4' />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className='flex flex-1 items-center justify-center text-center text-slate-500'>
                <div>
                  <MessageSquareText className='mx-auto mb-3 h-12 w-12 text-slate-300' />
                  <p className='text-lg font-medium text-slate-700'>Your inbox is empty</p>
                  <p className='mt-1 text-sm'>Start a conversation to see messages here.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
