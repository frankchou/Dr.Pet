'use client'

import { useCallback, useEffect, useState } from 'react'

// base64url（VAPID 公鑰）→ Uint8Array，pushManager.subscribe 的 applicationServerKey 標準轉換
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface SubscribeStatus {
  subscribed: boolean
  foodAlertEnabled: boolean
  reminderEnabled: boolean
}

type SupportState = 'checking' | 'ok' | 'unsupported' | 'ios-not-standalone'

// 偵測 iOS（含 iPadOS）— 用於「需先加入主畫面」提示
function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIPad = /Macintosh/.test(ua) && 'ontouchend' in document
  return /iPad|iPhone|iPod/.test(ua) || isIPad
}

// 是否以 PWA standalone 模式開啟（iOS Web Push 的前提）
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return iosStandalone === true || window.matchMedia('(display-mode: standalone)').matches
}

interface ToggleRowProps {
  label: string
  description: string
  enabled: boolean
  disabled: boolean
  busy: boolean
  onToggle: () => void
}

function ToggleRow({ label, description, enabled, disabled, busy, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled || busy}
        className={`w-[48px] h-7 rounded-full relative transition-colors duration-300 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
          enabled ? 'bg-[#111111]' : 'bg-slate-200'
        }`}
        aria-label={enabled ? '關閉' : '開啟'}
      >
        {busy ? (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        )}
      </button>
    </div>
  )
}

export default function PushSettings() {
  const [support, setSupport] = useState<SupportState>('checking')
  const [status, setStatus] = useState<SubscribeStatus | null>(null)
  const [busyKind, setBusyKind] = useState<'foodAlert' | 'reminder' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 從後端載入目前訂閱狀態與兩開關
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/push/subscribe')
      if (res.ok) setStatus((await res.json()) as SubscribeStatus)
    } catch {
      /* 靜默忽略，沿用本地預設 */
    }
  }, [])

  useEffect(() => {
    // 能力偵測：含 iOS 非 standalone 的特例
    const hasApis =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    if (!hasApis) {
      if (isIos() && !isStandalone()) {
        setSupport('ios-not-standalone')
      } else {
        setSupport('unsupported')
      }
      return
    }
    if (isIos() && !isStandalone()) {
      setSupport('ios-not-standalone')
      return
    }
    setSupport('ok')
    loadStatus()
  }, [loadStatus])

  // 確保 SW 已註冊並取得 registration
  const getRegistration = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js')
    if (existing) return existing
    return navigator.serviceWorker.register('/sw.js')
  }, [])

  // 建立瀏覽器訂閱並回傳序列化結果（已存在則沿用）
  const ensureBrowserSubscription = useCallback(async () => {
    const registration = await getRegistration()
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) throw new Error('VAPID public key missing')

    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
  }, [getRegistration])

  // 開啟某類推播：請求權限 → 訂閱 → 寫後端（帶該類開關 true）
  const enableKind = useCallback(
    async (kind: 'foodAlert' | 'reminder', otherEnabled: boolean) => {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage('通知權限未開啟，請到瀏覽器設定允許通知後再試')
        return
      }

      const sub = await ensureBrowserSubscription()
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          foodAlertEnabled: kind === 'foodAlert' ? true : otherEnabled,
          reminderEnabled: kind === 'reminder' ? true : otherEnabled,
        }),
      })
    },
    [ensureBrowserSubscription],
  )

  // 關閉某類推播：若兩類都關 → 退訂瀏覽器；否則只更新另一類開關
  const disableKind = useCallback(
    async (kind: 'foodAlert' | 'reminder', otherEnabled: boolean) => {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await registration?.pushManager.getSubscription()

      if (!otherEnabled) {
        // 兩類都關：完整退訂
        if (sub) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        return
      }

      // 仍保留另一類：更新後端開關（沿用既有訂閱）
      if (sub) {
        const json = sub.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            foodAlertEnabled: kind === 'foodAlert' ? false : otherEnabled,
            reminderEnabled: kind === 'reminder' ? false : otherEnabled,
          }),
        })
      }
    },
    [],
  )

  const handleToggle = useCallback(
    async (kind: 'foodAlert' | 'reminder') => {
      if (!status) return
      setMessage(null)
      setBusyKind(kind)

      // 顯示用的「開啟」狀態：需有訂閱且該旗標為 true（demo 與真實帳號一致）
      const displayedOn = (flag: boolean) => status.subscribed && flag
      const current = displayedOn(
        kind === 'foodAlert' ? status.foodAlertEnabled : status.reminderEnabled,
      )
      const other = displayedOn(
        kind === 'foodAlert' ? status.reminderEnabled : status.foodAlertEnabled,
      )
      const next = !current

      try {
        if (next) {
          await enableKind(kind, other)
        } else {
          await disableKind(kind, other)
        }
        // 以後端為準重新載入狀態
        await loadStatus()
      } catch {
        setMessage('設定失敗，請再試一次')
      } finally {
        setBusyKind(null)
      }
    },
    [status, enableKind, disableKind, loadStatus],
  )

  if (support === 'checking') {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (support === 'ios-not-standalone') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-sm font-bold text-slate-700 mb-1">iPhone / iPad 需先加入主畫面</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          請用 Safari 點下方分享鍵，選「加入主畫面」，再從主畫面的 App 圖示開啟本站，即可開啟推播通知。
        </p>
      </div>
    )
  }

  if (support === 'unsupported') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-sm font-bold text-slate-700 mb-1">此瀏覽器不支援推播通知</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          請改用支援 Web Push 的瀏覽器（如電腦版 Chrome、Edge，或 Android Chrome）。
        </p>
      </div>
    )
  }

  // 顯示用：需有訂閱且旗標為 true 才算開啟（demo 與真實帳號一致）
  const foodAlertOn = Boolean(status?.subscribed && status?.foodAlertEnabled)
  const reminderOn = Boolean(status?.subscribed && status?.reminderEnabled)

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        開啟後，重要食安警報與毛孩的用藥/美容提醒會主動推播到此裝置。
      </p>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm divide-y divide-slate-50">
        <ToggleRow
          label="食安警報推播"
          description="出現重要食品安全/危險成分快訊時通知你"
          enabled={foodAlertOn}
          disabled={false}
          busy={busyKind === 'foodAlert'}
          onToggle={() => handleToggle('foodAlert')}
        />
        <ToggleRow
          label="用藥/美容提醒"
          description="毛孩的下次用藥、驅蟲、美容到期時提醒你"
          enabled={reminderOn}
          disabled={false}
          busy={busyKind === 'reminder'}
          onToggle={() => handleToggle('reminder')}
        />
      </div>

      {message && <p className="text-xs font-bold text-[#C4714A] px-1">{message}</p>}
    </div>
  )
}
