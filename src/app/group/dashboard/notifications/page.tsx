import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Push Notifications • Scouts des Cèdres',
}

export default async function NotificationsRedirectPage() {
  // Seamlessly redirect to the unified Communications & Broadcast Hub push tab
  redirect('/group/dashboard/broadcast?tab=push')
}
