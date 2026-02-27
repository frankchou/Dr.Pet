'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { Textarea, Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { severityEmoji, severityLabel } from '@/lib/utils'
import type { Pet } from '@/types'

const SYMPTOM_OPTIONS = [
  { value: 'tear', label: '淚腺/淚痕' },
  { value: 'skin', label: '皮膚搔癢' },
  { value: 'digestive', label: '腸胃敏感' },
  { value: 'oral', label: '口臭牙結石' },
  { value: 'ear', label: '耳朵發炎' },
  { value: 'joint', label: '關節問題' },
  { value: 'other', label: '其他' },
]

const SIDE_OPTIONS = [
  { value: '不適用', label: '不適用' },
  { value: '左', label: '左' },
  { value: '右', label: '右' },
  { value: '雙側', label: '雙側' },
]

function NewSymptomForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultType = searchParams.get('type') || 'tear'

  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    petId: '',
    symptomType: defaultType,
    severity: 1,
    side: '不適用',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/pets')
      .then((r) => r.json())
      .then((data: Pet[]) => {
        setPets(data)
        if (data.length > 0) {
          setForm((prev) => ({ ...prev, petId: data[0].id }))
        }
      })
      .catch(() => setError('載入寵物資料失敗'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.petId) {
      setError('請先建立寵物檔案')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '建立失敗')
      }

      router.push('/symptoms')
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="記錄症狀" backHref="/symptoms" />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        {pets.length > 1 && (
          <Select
            label="選擇寵物"
            value={form.petId}
            onChange={(e) => setForm((prev) => ({ ...prev, petId: e.target.value }))}
            options={pets.map((p) => ({ value: p.id, label: p.name }))}
          />
        )}

        <Select
          label="症狀類型 *"
          value={form.symptomType}
          onChange={(e) => setForm((prev) => ({ ...prev, symptomType: e.target.value }))}
          options={SYMPTOM_OPTIONS}
        />

        {/* Severity slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            嚴重程度 *
          </label>
          <div className="text-center mb-3">
            <span className="text-4xl">{severityEmoji(form.severity)}</span>
            <p className="text-sm font-medium text-[#1a1a2e] mt-1">
              {severityLabel(form.severity)} ({form.severity}/5)
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={form.severity}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, severity: parseInt(e.target.value) }))
            }
            className="w-full accent-[#4F7CFF]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0 正常</span>
            <span>5 極重</span>
          </div>
        </div>

        <Select
          label="部位"
          value={form.side}
          onChange={(e) => setForm((prev) => ({ ...prev, side: e.target.value }))}
          options={SIDE_OPTIONS}
        />

        <Textarea
          label="備註"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="描述症狀細節、發生情境等..."
          rows={4}
        />

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          儲存記錄
        </Button>
      </form>
    </div>
  )
}

export default function NewSymptomPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400">載入中...</div>}>
      <NewSymptomForm />
    </Suspense>
  )
}
