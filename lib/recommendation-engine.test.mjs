import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getRentalMarketInsights,
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
  })
})
