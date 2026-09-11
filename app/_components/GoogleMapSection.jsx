import React, { useCallback, useEffect, useState } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import MarkerItem from './MarkerItem';
const containerStyle = {
    width: '100%',
    height: '80vh',
    borderRadius: 10,
  };
  

function GoogleMapSection({ coordinates, listing }) {
    const [center, setCenter] = useState({
        lat: 40.73061,
        lng: -73.935242,
    })
    const [map, setMap] = useState(null)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: ['places'],
        skip: !apiKey,
    })

    useEffect(() => {
        if (coordinates) setCenter(coordinates)
    }, [coordinates])

    useEffect(() => {
        if (map) {
            map.setZoom(10)
        }
    }, [map])

    const onLoad = useCallback(function callback(map) {
        const bounds = new window.google.maps.LatLngBounds(center)
        map.fitBounds(bounds)
        setMap(map)
    }, [center])

    const onUnmount = React.useCallback(function callback(map) {
        setMap(null)
    }, [])

    if (loadError) {
        return <div className="p-4 text-sm text-red-600">Unable to load Google Maps.</div>
    }

    if (!isLoaded) {
        return <div className="p-4 text-sm text-slate-600">Loading map...</div>
    }

    return (
        <div>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={10}
                onLoad={onLoad}
                onUnmount={onUnmount}
                gestureHandling="greedy"
            >
                {listing?.map((item, index) => (
                    <MarkerItem
                        key={index}
                        item={item}
                    />
                ))}
            </GoogleMap>
        </div>
    )
}

export default GoogleMapSection