'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PetGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // localStorage 僅存在於 client，於掛載後判定是否已選毛孩（避免 SSR mismatch）
    const petId = localStorage.getItem('drpet_currentPetId')
    if (!petId) {
      router.replace('/settings')
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true)
    }
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
