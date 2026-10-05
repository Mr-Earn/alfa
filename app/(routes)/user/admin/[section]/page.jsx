import AdminRoute from '../AdminRoute'

export default function AdminSectionPage({ params }) {
  return <AdminRoute section={params.section} />
}