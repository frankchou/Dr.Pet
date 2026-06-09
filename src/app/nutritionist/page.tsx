'use client'

import NutritionistChat from '@/components/chat/NutritionistChat'

// AI 諮詢頁：對話 UI/邏輯已抽至共用元件 NutritionistChat，
// 與日誌頁浮動入口的 bottom-sheet modal 共用同一份實作。
export default function NutritionistPage() {
  return <NutritionistChat />
}
