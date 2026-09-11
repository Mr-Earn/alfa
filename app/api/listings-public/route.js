import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

function normalizeListingRow(row = {}) {
  return {
    ...row,
    createdBy: row.createdBy ?? row.createdby ?? null,
    propertyType: row.propertyType ?? row.propertytype ?? null,
  }
}

async function getListingColumns() {
  const { data, error } = await supabaseAdmin.from('listings').select('*').limit(1)
  if (error || !data?.length) return new Set()
  return new Set(Object.keys(data[0]))
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  const address = searchParams.get('address')
  const bedroom = searchParams.get('bedroom')
  const bathroom = searchParams.get('bathroom')
  const parking = searchParams.get('parking')
  const homeType = searchParams.get('homeType')

  if (!supabaseAdmin) {
    return NextResponse.json({ listings: [] }, { status: 200 })
  }

  try {
    const columns = await getListingColumns()
    let query = supabaseAdmin
      .from('listings')
      .select('*')
      .eq('active', true)

    if (id) {
      query = query.eq('id', id)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (address) {
      query = query.like('address', `%${address}%`)
    }

    if (bedroom) {
      query = query.gte('bedroom', Number(bedroom))
    }

    if (bathroom) {
      query = query.gte('bathroom', Number(bathroom))
    }

    if (parking) {
      query = query.gte('parking', Number(parking))
    }

    if (homeType) {
      const propertyColumn = columns.has('propertytype') ? 'propertytype' : 'propertyType'
      if (columns.has(propertyColumn)) {
        query = query.eq(propertyColumn, homeType)
      }
    }

    query = query.order('id', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ listings: [] }, { status: 200 })
    }

    const listings = (data || []).map(normalizeListingRow)
    return NextResponse.json({ listings }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('Error fetching listings:', err)
    return NextResponse.json({ listings: [] }, { status: 200 })
  }
}
