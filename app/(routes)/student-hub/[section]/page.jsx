import { notFound } from 'next/navigation'
import StudentHubPage from '../page'

const studentHubSections = ['housing', 'support', 'community', 'finance', 'residence', 'documents', 'rewards']

export default function StudentHubSectionPage({ params }) {
  if (!studentHubSections.includes(params.section)) notFound()
  return <StudentHubPage section={params.section} />
}