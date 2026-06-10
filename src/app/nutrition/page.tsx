'use client'

import { useEffect, useState } from 'react'
import IngredientAnalysis from '@/components/home/IngredientAnalysis'
import CorrelationInsights from '@/components/nutrition/CorrelationInsights'

export default function NutritionPage() {
  const [petId, setPetId] = useState('')

  useEffect(() => {
    // localStorage 僅存在於 client，惰性初始化會造成 SSR/hydration 不一致，故於 effect 水合
    const stored = localStorage.getItem('drpet_currentPetId')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setPetId(stored)

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'drpet_currentPetId' && e.newValue) setPetId(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div className="px-6 md:px-8 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <IngredientAnalysis petId={petId} />
      <CorrelationInsights petId={petId} />
    </div>
  )
}
