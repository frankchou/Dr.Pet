'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PetGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const petId = localStorage.getItem('drpet_currentPetId')
    if (!petId) {
      router.replace('/settings')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
