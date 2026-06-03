'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { Input, Textarea, Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const MAIN_PROBLEM_OPTIONS = [
  { value: 'tear', label: '淚腺/淚痕' },
  { value: 'skin', label: '皮膚搔癢' },
  { value: 'digestive', label: '腸胃敏感' },
  { value: 'oral', label: '口臭牙結石' },
  { value: 'ear', label: '耳朵發炎' },
  { value: 'joint', label: '關節問題' },
  { value: 'other', label: '其他' },
]

export default function NewPetPage() {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    name: '',
    species: '狗',
    breed: '',
    sex: '公',
    birthday: '',
    weight: '',
    isNeutered: false,
    allergies: '',
    medicalHistory: '',
    mainProblems: [] as string[],
  })

  const toggleProblem = (value: string) => {
    setForm((prev) => ({
      ...prev,
      mainProblems: prev.mainProblems.includes(value)
        ? prev.mainProblems.filter((p) => p !== value)
        : [...prev.mainProblems, value],
    }))
  }

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('請輸入寵物名稱')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Upload avatar first if selected
      let avatarUrl: string | null = null
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          avatarUrl = uploadData.url
        }
      }

      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weight: form.weight ? parseFloat(form.weight) : null,
          avatar: avatarUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '建立失敗')
      }

      router.push('/pet')
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const speciesEmoji = form.species === '狗' ? '🐕' : form.species === '貓' ? '🐈' : '🐾'

  return (
    <div>
      <PageHeader title="新增寵物" backHref="/pet" />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Avatar upload */}
        <div className="flex flex-col items-center py-2">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-[#4F7CFF] transition-colors overflow-hidden flex items-center justify-center"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{speciesEmoji}</span>
            )}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-end justify-center pb-1">
              <span className="text-white text-xs opacity-0 hover:opacity-100">更換</span>
            </div>
          </button>
          <p className="text-xs text-gray-400 mt-2">點擊上傳寵物照片</p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarSelect(f) }}
          />
        </div>

        <Input
          label="寵物名稱 *"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="例如：小花"
        />

        <Select
          label="物種 *"
          value={form.species}
          onChange={(e) => setForm((prev) => ({ ...prev, species: e.target.value }))}
          options={[
            { value: '狗', label: '狗' },
            { value: '貓', label: '貓' },
            { value: '其他', label: '其他' },
          ]}
        />

        <Input
          label="品種"
          value={form.breed}
          onChange={(e) => setForm((prev) => ({ ...prev, breed: e.target.value }))}
          placeholder="例如：柴犬"
        />

        <Select
          label="性別 *"
          value={form.sex}
          onChange={(e) => setForm((prev) => ({ ...prev, sex: e.target.value }))}
          options={[
            { value: '公', label: '公' },
            { value: '母', label: '母' },
            { value: '未知', label: '未知' },
          ]}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isNeutered"
            checked={form.isNeutered}
            onChange={(e) => setForm((prev) => ({ ...prev, isNeutered: e.target.checked }))}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="isNeutered" className="text-sm font-medium text-gray-700">
            已結紮
          </label>
        </div>

        <Input
          label="生日"
          type="date"
          value={form.birthday}
          onChange={(e) => setForm((prev) => ({ ...prev, birthday: e.target.value }))}
        />

        <Input
          label="體重 (kg)"
          type="number"
          step="0.1"
          value={form.weight}
          onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
          placeholder="例如：5.2"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            主要健康問題
          </label>
          <div className="flex flex-wrap gap-2">
            {MAIN_PROBLEM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleProblem(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.mainProblems.includes(opt.value)
                    ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#4F7CFF]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="過敏史"
          value={form.allergies}
          onChange={(e) => setForm((prev) => ({ ...prev, allergies: e.target.value }))}
          placeholder="記錄已知的過敏原或不耐受食物"
        />

        <Textarea
          label="病史"
          value={form.medicalHistory}
          onChange={(e) => setForm((prev) => ({ ...prev, medicalHistory: e.target.value }))}
          placeholder="記錄重要的病史、手術或長期用藥"
        />

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          建立寵物檔案
        </Button>
      </form>
    </div>
  )
}
