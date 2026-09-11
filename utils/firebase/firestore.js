import { collection, doc, getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { firestore, firebaseConfigured } from './client'

function requireFirestore() {
  if (!firebaseConfigured || !firestore) {
    throw new Error('Firebase is not configured. Set your NEXT_PUBLIC_FIREBASE_* env vars.')
  }
  return firestore
}

function ownerListingsCollection() {
  return collection(requireFirestore(), 'owner_listings')
}

function ownerBookingsCollection() {
  return collection(requireFirestore(), 'owner_bookings')
}

export async function getOwnerListings(ownerEmail) {
  if (!ownerEmail) return []
  const q = query(ownerListingsCollection(), where('createdBy', '==', ownerEmail), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
}

export async function addOwnerListing(listing) {
  const docRef = await addDoc(ownerListingsCollection(), {
    ...listing,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const created = await getDocs(query(ownerListingsCollection(), where('__name__', '==', docRef.id)))
  return { id: docRef.id, ...listing }
}

export async function updateOwnerListing(listingId, updates) {
  const docRef = doc(requireFirestore(), 'owner_listings', listingId)
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() })
  return { id: listingId, ...updates }
}

export async function deleteOwnerListing(listingId) {
  const docRef = doc(requireFirestore(), 'owner_listings', listingId)
  await deleteDoc(docRef)
  return listingId
}

export async function getOwnerBookings(ownerEmail) {
  if (!ownerEmail) return []
  const q = query(ownerBookingsCollection(), where('ownerEmail', '==', ownerEmail), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
}

export async function addOwnerBooking(booking) {
  const docRef = await addDoc(ownerBookingsCollection(), {
    ...booking,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: docRef.id, ...booking }
}

export async function updateOwnerBooking(bookingId, updates) {
  const docRef = doc(requireFirestore(), 'owner_bookings', bookingId)
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() })
  return { id: bookingId, ...updates }
}

export async function deleteOwnerBooking(bookingId) {
  const docRef = doc(requireFirestore(), 'owner_bookings', bookingId)
  await deleteDoc(docRef)
  return bookingId
}
