import { useEffect, useState } from 'react'
import { firestore, firebaseConfigured } from './client'

export default function useFirestore() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(Boolean(firebaseConfigured && firestore))
  }, [])

  return ready
}
