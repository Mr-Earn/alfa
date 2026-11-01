"use client"
import { useJsApiLoader } from '@react-google-maps/api'
import { MapPin } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import GooglePlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-google-places-autocomplete'

function GoogleAddressSearch({ selectedAddress, setCoordinates, value, onChange }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const [inputValue, setInputValue] = useState(value || '')
  const [selectedPlace, setSelectedPlace] = useState(null)

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value || '')
      if (!value || selectedPlace?.label !== value) {
        setSelectedPlace(null)
      }
    }
  }, [value, selectedPlace?.label])

  const updateAddress = (nextValue) => {
    const normalizedValue = typeof nextValue === 'string' ? nextValue.trim() : ''
    setInputValue(normalizedValue)
    setSelectedPlace(null)

    if (typeof onChange === 'function') {
      onChange(normalizedValue)
    } else if (typeof selectedAddress === 'function') {
      selectedAddress(normalizedValue ? { label: normalizedValue } : null)
    }

    setCoordinates?.(null)
  }

  const handlePlaceChange = (place) => {
    if (!place) {
      updateAddress('')
      return
    }

    const nextValue = place.label || ''
    setInputValue(nextValue)
    setSelectedPlace(place)
    if (typeof onChange === 'function') {
      onChange(nextValue)
    } else if (typeof selectedAddress === 'function') {
      selectedAddress(nextValue ? { label: nextValue } : null)
    }
    geocodeByAddress(nextValue)
      .then((result) => getLatLng(result[0]))
      .then(({ lat, lng }) => setCoordinates?.({ lat, lng }))
      .catch(() => setCoordinates?.(null))
  }

  const handleInputChange = (nextValue, actionMeta) => {
    if (actionMeta.action === 'input-change') {
      updateAddress(nextValue)
    }
    return nextValue
  }

  const handleManualAddressChange = (event) => {
    updateAddress(event.target.value)
  }

  return (
    <div className='flex w-full flex-col gap-2'>
      <div className='flex w-full items-center'>
        <MapPin className='h-10 w-10 rounded-l-lg bg-purple-200 p-2 text-primary' />
        {apiKey ? (
          <div className='flex-1'>
            <GooglePlacesAutocomplete
              apiKey={apiKey}
              selectProps={{
                placeholder: 'Search Property Address',
                isClearable: true,
                className: 'w-full',
                inputValue,
                value: selectedPlace,
                onInputChange: handleInputChange,
                noOptionsMessage: ({ inputValue: searchValue }) => (
                  searchValue ? 'No suggestions available. Use the typed address.' : 'Start typing an address.'
                ),
                onChange: handlePlaceChange,
              }}
            />
          </div>
        ) : (
          <input
            value={manualValue}
            onChange={handleManualAddressChange}
            placeholder='Enter property address manually'
            className='w-full rounded-r-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary'
          />
        )}
      </div>
      <p className='text-xs text-slate-500'>Search with Google or type the full address manually.</p>
    </div>
  )
}

export default GoogleAddressSearch