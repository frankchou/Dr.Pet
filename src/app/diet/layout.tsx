import PetGuard from '@/components/layout/PetGuard'

export default function DietLayout({ children }: { children: React.ReactNode }) {
  return <PetGuard>{children}</PetGuard>
}
