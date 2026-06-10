// PurePaw 無敏毛孩 — Web Push Service Worker
//
// 純 JS，不經 Next 編譯，放 public/ 由根路徑 /sw.js 提供。
// 只處理推播相關事件：push（顯示通知）與 notificationclick（聚焦/開啟頁面）。

// install / activate：讓更新即時生效，新版 SW 接管所有頁面
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// 收到推播：解析 payload 顯示系統通知
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // payload 非 JSON 時退回純文字當內文
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'PurePaw 無敏毛孩'
  // 個人化頭條（命中飼主正在使用的產品）→ 顯示更顯眼：需手動關閉、震動、同 tag 覆寫時重新提醒
  const isHeadline = data.headline === true || data.priority === 'high'
  const options = {
    body: data.body || '',
    icon: data.icon || '/app-logo.png',
    badge: data.badge || '/app-logo.png',
    tag: data.tag,
    data: { url: data.url || '/news', headline: isHeadline },
    requireInteraction: isHeadline,
    renotify: isHeadline && !!data.tag,
    vibrate: isHeadline ? [200, 100, 200] : undefined,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// 點擊通知：聚焦既有同源視窗並導向目標頁，否則開新視窗
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/news'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(targetUrl)
            return
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
      }),
  )
})
