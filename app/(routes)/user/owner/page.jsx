import UserListing from '../_components/UserListing'

export default function OwnerIndexPage() {
  return (
    <div>
      <h1 className='text-3xl font-bold text-slate-900 mb-4'>My listings</h1>
      <UserListing />
    </div>
  )
}
