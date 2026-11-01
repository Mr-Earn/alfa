const weights = {
  budget: 30,
  location: 25,
  accommodationType: 15,
  bedrooms: 10,
  bathrooms: 5,
  lifestyle: 10,
  parking: 5,
}

const lifestyleKeywords = {
  quiet: ['quiet', 'peaceful', 'calm', 'tranquil'],
  social: ['social', 'communal', 'shared', 'common area', 'entertainment'],
  'study-focused': ['study', 'desk', 'internet', 'quiet', 'student'],
}

const normalizeText = (value) => String(value || '').toLowerCase().trim().replace(/\s+/g, ' ')

export function isNsfasAccreditationVerified(listing, today = new Date()) {
  const status = normalizeText(listing.nsfas_accreditation_status)
  const source = String(listing.nsfas_accreditation_source || '').trim()
  const verifiedAt = listing.nsfas_verified_at
  const verifiedBy = listing.nsfas_verified_by
  const expiresAt = listing.nsfas_accredited_until
  const sourceIsSecureUrl = (() => {
    try {
      return new URL(source).protocol === 'https:'
    } catch {
      return false
    }
  })()

  if (status !== 'verified' || !sourceIsSecureUrl || !verifiedAt || !Number.isFinite(Date.parse(verifiedAt)) || !verifiedBy || !expiresAt) return false
  const expiryDate = new Date(`${String(expiresAt).slice(0, 10)}T23:59:59`)
  return Number.isFinite(expiryDate.getTime()) && expiryDate >= today
}

function getAccommodationType(listing) {
  const explicitType = normalizeText(listing.propertyType || listing.propertytype)
  const details = normalizeText(`${listing.title || ''} ${listing.description || ''}`)

  if (/\b(shared|sharing|communal)\b/.test(details)) return 'shared-flat'
  if (/\b(private room|own room|room to rent)\b/.test(details)) return 'private-room'
  if (explicitType.includes('studio')) return 'studio'
  if (explicitType.includes('apartment') || explicitType.includes('flat')) return 'apartment'
  if (explicitType.includes('house') || explicitType.includes('condo')) return 'house'
  return ''
}

function scoreBudget(price, budget) {
  if (!Number.isFinite(price) || !Number.isFinite(budget) || budget <= 0 || price <= 0) return null
  const ratio = price / budget
  if (ratio <= 0.7) return 100
  if (ratio <= 1) return 100 - ((ratio - 0.7) / 0.3) * 25
  if (ratio <= 1.2) return 75 - ((ratio - 1) / 0.2) * 50
  if (ratio < 1.5) return ((1.5 - ratio) / 0.3) * 25
  return 0
}

function scoreLocation(listing, preferredLocation) {
  if (!preferredLocation) return null
  const location = normalizeText(`${listing.address || ''} ${listing.city || ''} ${listing.country || ''}`)
  if (!location) return null
  if (location.includes(preferredLocation)) return 100

  const tokens = [...new Set(preferredLocation.split(/[^a-z0-9]+/).filter((token) => token.length > 1))]
  if (!tokens.length) return null
  const matchedTokens = tokens.filter((token) => location.includes(token))
  return (matchedTokens.length / tokens.length) * 100
}

function isValidPositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0
}

export function listingMeetsRequirements(listing, preferences) {
  const minBedrooms = Number(preferences.minBedrooms) || 0
  const minBathrooms = Number(preferences.minBathrooms) || 0
  const bedroomCount = Number(listing.bedroom)
  const bathroomCount = Number(listing.bathroom)

  if (minBedrooms > 0 && (!Number.isFinite(bedroomCount) || bedroomCount < minBedrooms)) return false
  if (minBathrooms > 0 && (!Number.isFinite(bathroomCount) || bathroomCount < minBathrooms)) return false
  if (preferences.requiresParking && !(Number(listing.parking) > 0)) return false
  return true
}

export function scoreListing(listing, preferences) {
  const details = normalizeText(`${listing.title || ''} ${listing.description || ''} ${listing.propertyType || listing.propertytype || ''}`)
  const requestedType = preferences.accommodationType || 'any'
  const requestedLifestyle = preferences.lifestyle || ''
  const components = []

  const addComponent = (key, label, score) => {
    if (score === null || !Number.isFinite(score)) return
    components.push({ key, label, score: Math.round(Math.max(0, Math.min(100, score))), weight: weights[key] })
  }

  addComponent('budget', 'Monthly budget', scoreBudget(Number(listing.price), Number(preferences.budget)))
  addComponent('location', 'Preferred area', scoreLocation(listing, normalizeText(preferences.campus)))

  if (requestedType !== 'any') {
    const listingType = getAccommodationType(listing)
    if (listingType) addComponent('accommodationType', 'Accommodation type', listingType === requestedType ? 100 : 0)
  }

  if (Number(preferences.minBedrooms) > 0 && Number.isFinite(Number(listing.bedroom))) {
    addComponent('bedrooms', 'Bedroom requirement', 100)
  }

  if (Number(preferences.minBathrooms) > 0 && Number.isFinite(Number(listing.bathroom))) {
    addComponent('bathrooms', 'Bathroom requirement', 100)
  }

  if (requestedLifestyle && details) {
    const terms = lifestyleKeywords[requestedLifestyle] || []
    if (terms.length) {
      const matchingTerms = terms.filter((term) => details.includes(term))
      addComponent('lifestyle', 'Lifestyle details', matchingTerms.length ? (matchingTerms.length / terms.length) * 100 : 0)
    }
  }

  if (preferences.requiresParking && Number.isFinite(Number(listing.parking))) {
    addComponent('parking', 'Parking requirement', Number(listing.parking) > 0 ? 100 : 0)
  }

  const possibleWeight = Object.entries(weights).reduce((total, [key, weight]) => {
    const relevant = key === 'budget'
      ? Number(preferences.budget) > 0
      : key === 'location'
        ? Boolean(normalizeText(preferences.campus))
        : key === 'accommodationType'
          ? requestedType !== 'any'
          : key === 'bedrooms'
            ? Number(preferences.minBedrooms) > 0
            : key === 'bathrooms'
              ? Number(preferences.minBathrooms) > 0
              : key === 'lifestyle'
                ? Boolean(requestedLifestyle)
                : Boolean(preferences.requiresParking)
    return total + (relevant ? weight : 0)
  }, 0)
  const observedWeight = components.reduce((total, component) => total + component.weight, 0)
  const earnedScore = components.reduce((total, component) => total + component.score * component.weight, 0)
  const missingWeight = Math.max(0, possibleWeight - observedWeight)

  return {
    score: observedWeight ? Math.round((earnedScore + missingWeight * 50) / possibleWeight) : 0,
    coverage: possibleWeight ? Math.round((observedWeight / possibleWeight) * 100) : 0,
    components,
  }
}

export function rankListings(listings, preferences, searchQuery = '') {
  const query = normalizeText(searchQuery)
  return listings
    .filter((listing) => !preferences.requireNsfasAccreditation || isNsfasAccreditationVerified(listing))
    .filter((listing) => listingMeetsRequirements(listing, preferences))
    .filter((listing) => !query || normalizeText(`${listing.title || ''} ${listing.address || ''} ${listing.city || ''} ${listing.description || ''}`).includes(query))
    .map((listing) => ({ listing, ...scoreListing(listing, preferences) }))
    .sort((first, second) => {
      const scoreDifference = second.score - first.score
      if (scoreDifference) return scoreDifference
      const firstPrice = Number(first.listing.price)
      const secondPrice = Number(second.listing.price)
      const validFirstPrice = isValidPositiveNumber(firstPrice)
      const validSecondPrice = isValidPositiveNumber(secondPrice)
      if (validFirstPrice !== validSecondPrice) return validFirstPrice ? -1 : 1
      if (validFirstPrice && firstPrice !== secondPrice) return firstPrice - secondPrice
      return String(first.listing.id || '').localeCompare(String(second.listing.id || ''))
    })
}

export function getRentalMarketInsights(listings, budget) {
  const prices = listings
    .map((listing) => Number(listing.price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((first, second) => first - second)
  const middle = Math.floor(prices.length / 2)
  const medianRent = prices.length
    ? prices.length % 2
      ? prices[middle]
      : (prices[middle - 1] + prices[middle]) / 2
    : null
  const monthlyBudget = Number(budget)

  return {
    activeListings: listings.length,
    pricedListings: prices.length,
    medianRent,
    withinBudget: monthlyBudget > 0 ? prices.filter((price) => price <= monthlyBudget).length : null,
    verifiedNsfasListings: listings.filter((listing) => isNsfasAccreditationVerified(listing)).length,
    listingsWithLocation: listings.filter((listing) => Boolean(normalizeText(`${listing.address || ''} ${listing.city || ''}`))).length,
  }
}
