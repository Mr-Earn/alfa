// scripts/smoke_test_bookings.js
// Usage:
//   BASE_URL=http://localhost:3000 AUTH_TOKEN=your_token node scripts/smoke_test_bookings.js

const fetch = global.fetch || require('node-fetch')
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const AUTH = process.env.AUTH_TOKEN || ''

async function req(path, opts = {}) {
  const headers = opts.headers || {}
  if (AUTH) headers['Authorization'] = `Bearer ${AUTH}`
  if (opts.json) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + path, { ...opts, headers })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body }
}

async function run() {
  console.log('GET /api/bookings?mine=true')
  const g = await req('/api/bookings?mine=true')
  console.log('Status:', g.status)
  console.log('Body:', JSON.stringify(g.body, null, 2))

  console.log('\nPOST /api/bookings (demo payload)')
  const payload = {
    listing_id: 'demo-listing-1',
    listing_title: 'Demo Listing (smoke test)',
    user_id: 'demo-student-1',
    contact_email: 'student1@example.com',
    move_in_date: '2026-09-01',
    message: 'Smoke test booking',
  }
  const p = await req('/api/bookings', { method: 'POST', json: true, body: JSON.stringify(payload) })
  console.log('Status:', p.status)
  console.log('Body:', JSON.stringify(p.body, null, 2))
}

run().catch((e) => { console.error(e); process.exit(1) })
