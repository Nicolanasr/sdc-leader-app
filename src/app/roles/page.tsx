import RolesGuideClient from './RolesGuideClient'

export const metadata = {
  title: 'Leader Roles & Onboarding Guide | Scouts des Cèdres',
  description:
    'Detailed role permissions, workflows, and step-by-step instructions for every leader role in Groupe Saint Jean Marc.',
}

export default async function RolesGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role } = await searchParams
  return <RolesGuideClient initialRoleId={role} />
}
