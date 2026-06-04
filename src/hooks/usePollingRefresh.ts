'use client'

import { useEffect, useRef } from 'react'

/**
 * 共享資料即時同步用的輪詢 hook。
 *
 * 共同飼主場景下，多人可能同時操作同一隻毛孩的資料；本 hook 讓頁面在
 * 不引入 SWR / React Query 的前提下，定時與「重新聚焦」時重抓既有資料。
 *
 * 行為：
 * - 每 `intervalMs`（預設 25 秒）呼叫一次 `refresh`。
 * - 分頁切回可見（visibilitychange → visible）時立即 `refresh`；
 *   分頁隱藏時暫停輪詢，避免背景分頁浪費請求。
 * - 視窗重新取得焦點（window focus）時也 `refresh`。
 * - 卸載時清掉 interval 與所有 listener。
 *
 * 注意：`refresh` 應以 `useCallback` 穩定參考傳入，否則每次重繪都會
 * 重設 interval / listener。
 */
export function usePollingRefresh(refresh: () => void, intervalMs = 25000): void {
  // 用 ref 保存最新的 refresh，listener / interval 內永遠呼叫到最新版本，
  // 避免把 refresh 放進 effect 相依而頻繁重建計時器。
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (intervalId !== null) return
      intervalId = setInterval(() => refreshRef.current(), intervalMs)
    }

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRef.current()
        startPolling()
      } else {
        // 背景分頁暫停輪詢，省資源
        stopPolling()
      }
    }

    const handleFocus = () => {
      refreshRef.current()
    }

    // 起始：若分頁目前可見才開始輪詢
    if (document.visibilityState === 'visible') {
      startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [intervalMs])
}
