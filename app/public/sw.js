// Tiker Service Worker for Push Notifications
// Handles push events and notification clicks.

self.addEventListener('push', function(event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Tiker', body: event.data.text() }
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'tiker-notification',
    data: {
      url: data.url || '/',
      type: data.type || 'general',
    },
    actions: data.actions || [],
    requireInteraction: data.type === 'reminder' || data.type === 'escalation',
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tiker', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  // Handle action buttons
  if (event.action === 'snooze') {
    // Post to snooze API
    event.waitUntil(
      fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: event.notification.data?.reminder_id,
          action: 'snooze',
          hours: 1,
        }),
      })
    )
    return
  }

  if (event.action === 'complete') {
    event.waitUntil(
      fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: event.notification.data?.reminder_id,
          action: 'complete',
        }),
      })
    )
    return
  }

  // Default: open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(windowClients) {
      // Focus existing window if found
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new window
      return clients.openWindow(url)
    })
  )
})
