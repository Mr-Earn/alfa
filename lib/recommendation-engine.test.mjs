import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getRentalMarketInsights,
  isNsfasAccreditationVerified,
  listingMeetsRequirements,
  rankListings,
  scoreListing,
} from './recommendation-engine.mjs'

const preferences = {
  budget: '5000',
  campus: 'Central Campus',
  accommodationType: 'apartment',
  lifestyle: 'study-focused',
  minBedrooms: '1',
  minBathrooms: '1',
  requiresParking: true,
}

const listing = (overrides = {}) => ({
  id: 'listing-1',
  title: 'Quiet study apartment',
  description: 'Study desk and reliable internet',
  address: 'Central Campus Road',
  city: 'Cape Town',
  propertyType: 'Apartment',
  price: 4200,
  bedroom: 1,
  bathroom: 1,
  parking: 1,
  ...overrides,
})

test('ranks a listing meeting the complete profile above a less suitable listing', () => {
  const results = rankListings([
    listing({ id: 'poor-fit', address: 'North District', propertyType: 'House', price: 7200 }),
    listing({ id: 'good-fit' }),
  ], preferences)

  assert.equal(results[0].listing.id, 'good-fit')
  assert.ok(results[0].score > results[1].score)
  assert.equal(results[0].coverage, 100)
})

test('applies minimum bedroom, bathroom, and parking requirements as hard filters', () => {
  const results = rankListings([
    listing({ id: 'no-bedroom-data', bedroom: null }),
    listing({ id: 'too-few-bathrooms', bathroom: 0 }),
    listing({ id: 'no-parking', parking: 0 }),
    listing({ id: 'valid' }),
  ], preferences)

  assert.deepEqual(results.map((result) => result.listing.id), ['valid'])
  assert.equal(listingMeetsRequirements(listing({ parking: null }), preferences), false)
})

test('scores missing criteria as neutral and reports reduced data coverage', () => {
  const complete = scoreListing(listing(), preferences)
  const incomplete = scoreListing(listing({ address: '', city: '', description: '' }), preferences)

  assert.ok(incomplete.coverage < complete.coverage)
  assert.ok(incomplete.score < complete.score)
})

test('keeps listings with missing rent out of budget scoring', () => {
  const result = scoreListing(listing({ price: null }), preferences)

  assert.equal(result.components.some((component) => component.key === 'budget'), false)
})

test('requires verified status, HTTPS evidence, a verification timestamp, and current expiry', () => {
  const verifiedListing = listing({
    nsfas_accreditation_status: 'verified',
    nsfas_accreditation_source: 'https://nsfas.org.za/accommodation',
    nsfas_verified_at: '2026-10-01T10:00:00.000Z',
    nsfas_verified_by: 'university-reviewer',
    nsfas_accredited_until: '2027-03-31',
  })

  assert.equal(isNsfasAccreditationVerified(verifiedListing, new Date('2026-11-01T12:00:00')), true)
  assert.equal(isNsfasAccreditationVerified({ ...verifiedListing, nsfas_accreditation_source: 'http://nsfas.org.za/list' }), false)
  assert.equal(isNsfasAccreditationVerified({ ...verifiedListing, nsfas_accredited_until: '2026-10-31' }, new Date('2026-11-01T12:00:00')), false)
  assert.equal(isNsfasAccreditationVerified({ ...verifiedListing, nsfas_verified_at: null }), false)
  assert.equal(isNsfasAccreditationVerified({ ...verifiedListing, nsfas_verified_by: null }), false)
})

test('enforces verified NSFAS accreditation as a hard recommendation filter when requested', () => {
  const verified = listing({
    id: 'verified',
    nsfas_accreditation_status: 'verified',
    nsfas_accreditation_source: 'https://nsfas.org.za/accommodation',
    nsfas_verified_at: '2026-10-01T10:00:00.000Z',
    nsfas_verified_by: 'university-reviewer',
    nsfas_accredited_until: '2999-12-31',
  })
  const unverified = listing({ id: 'unverified' })

  assert.deepEqual(
    rankListings([unverified, verified], { ...preferences, requireNsfasAccreditation: true }).map((result) => result.listing.id),
    ['verified'],
  )
  assert.equal(rankListings([unverified], { ...preferences, requireNsfasAccreditation: false }).length, 1)
})

test('summarizes the active listing set with median rent and affordability count', () => {
  const insights = getRentalMarketInsights([
    listing({ price: 2000 }),
    listing({ price: 4000 }),
    listing({ price: 6000 }),
    listing({ price: 0 }),
  ], 4000)

  assert.deepEqual(insights, {
    activeListings: 4,
    pricedListings: 3,
    medianRent: 4000,
    withinBudget: 2,
    verifiedNsfasListings: 0,
    listingsWithLocation: 4,
  })
})
