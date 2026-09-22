/* eslint-disable @typescript-eslint/no-explicit-any */
export {}

const _self = self as any

_self.addEventListener('push', (event: any) => {
  if (!event.data) return

  let data: any = {}

  try {
    data = event.data.json()
  } catch {
    data = {
      title: 'Scouts des Cèdres',
      body: event.data.text(),
    }
  }

  const title = data.title || 'Scouts des Cèdres'
  const options = {
    body: data.body || 'New notification received.',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/android-chrome-192x192.png',
    tag: data.tag || 'sdc-notification',
    data: {
      url: data.url || '/group/dashboard',
      ...data.data,
    },
  }

  event.waitUntil(_self.registration.showNotification(title, options))
})

_self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/group/dashboard'

  event.waitUntil(
    _self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if ('focus' in client && typeof client.focus === 'function') {
          return client.focus().then((focusedClient: any) => {
            if (focusedClient && 'navigate' in focusedClient && targetUrl) {
              return focusedClient.navigate(targetUrl)
            }
          })
        }
      }

      if (_self.clients.openWindow) {
        return _self.clients.openWindow(targetUrl)
      }
    })
  )
})
