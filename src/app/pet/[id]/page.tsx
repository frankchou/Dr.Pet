'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { Input, Textarea, Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { symptomTypeLabel, parseJson } from '@/lib/utils'
import type { Pet } from '@/types'

const MAIN_PROBLEM_OPTIONS = [
  { value: 'tear', label: '淚腺/淚痕' },
  { value: 'skin', label: '皮膚搔癢' },
  { value: 'digestive', label: '腸胃敏感' },
  { value: 'oral', label: '口臭牙結石' },
  { value: 'ear', label: '耳朵發炎' },
  { value: 'joint', label: '關節問題' },
  { value: 'other', label: '其他' },
]

export default function PetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
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
    avatar: '' as string | null | undefined,
  })

  useEffect(() => {
    fetch(`/api/pets/${id}`)
      .then((r) => r.json())
      .then((data: Pet) => {
        setPet(data)
        const birthday = data.birthday
          ? new Date(data.birthday).toISOString().split('T')[0]
          : ''
        setForm({
          name: data.name,
          species: data.species,
          breed: data.breed || '',
          sex: data.sex,
          birthday,
          weight: data.weight ? String(data.weight) : '',
          isNeutered: data.isNeutered,
          allergies: data.allergies || '',
          medicalHistory: data.medicalHistory || '',
          mainProblems: parseJson<string[]>(data.mainProblems, []),
          avatar: data.avatar,
        })
      })
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false))
  }, [id])

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

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Upload new avatar if changed
      let avatarUrl = form.avatar
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          avatarUrl = uploadData.url
        }
      }

      const res = await fetch(`/api/pets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weight: form.weight ? parseFloat(form.weight) : null,
          avatar: avatarUrl,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      const updated = await res.json()
      setPet(updated)
      setAvatarFile(null)
      setAvatarPreview(null)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定要刪除此寵物檔案嗎？所有相關資料將一併刪除。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/pets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('刪除失敗')
      router.push('/pet')
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">載入中...</div>
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-gray-500">找不到寵物資料</p>
      </div>
    )
  }

  const speciesEmoji = pet.species === '狗' ? '🐕' : pet.species === '貓' ? '🐈' : '🐾'
  const editSpeciesEmoji = form.species === '狗' ? '🐕' : form.species === '貓' ? '🐈' : '🐾'
  const mainProblems = parseJson<string[]>(pet.mainProblems, [])
  const currentAvatarInEdit = avatarPreview || form.avatar

  return (
    <div>
      <PageHeader
        title="寵物資料"
        backHref="/"
        rightElement={
          <button
            onClick={() => { setEditing(!editing); setAvatarFile(null); setAvatarPreview(null) }}
            className="text-sm text-[#4F7CFF] font-medium"
          >
            {editing ? '取消' : '編輯'}
          </button>
        }
      />

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      {!editing ? (
        <div className="px-4 py-4 space-y-4">
          {/* Pet avatar card */}
          <div className="text-center py-4">
            {pet.avatar ? (
              <div className="w-24 h-24 rounded-full mx-auto mb-2 overflow-hidden border-2 border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="text-6xl mb-2">{speciesEmoji}</div>
            )}
            <h2 className="text-2xl font-bold text-[#1a1a2e]">{pet.name}</h2>
            <p className="text-gray-500 text-sm">
              {pet.species} {pet.breed ? `· ${pet.breed}` : ''} · {pet.sex}
              {pet.isNeutered ? ' · 已結紮' : ''}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {[
              { label: '體重', value: pet.weight ? `${pet.weight} kg` : '未記錄' },
              {
                label: '生日',
                value: pet.birthday
                  ? new Date(pet.birthday).toLocaleDateString('zh-TW')
                  : '未記錄',
              },
              {
                label: '主要問題',
                value:
                  mainProblems.length > 0
                    ? mainProblems.map((p: string) => symptomTypeLabel(p)).join('、')
                    : '無',
              },
              { label: '過敏史', value: pet.allergies || '無' },
              { label: '病史', value: pet.medicalHistory || '無' },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3 flex gap-3">
                <span className="text-sm text-gray-500 w-20 shrink-0">{item.label}</span>
                <span className="text-sm text-[#1a1a2e]">{item.value}</span>
              </div>
            ))}
          </div>

          <Button
            variant="danger"
            size="md"
            className="w-full"
            onClick={handleDelete}
            loading={deleting}
          >
            刪除寵物檔案
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4 pb-8">
          {/* Avatar edit */}
          <div className="flex flex-col items-center py-2">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-[#4F7CFF] transition-colors overflow-hidden flex items-center justify-center"
            >
              {currentAvatarInEdit ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentAvatarInEdit} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{editSpeciesEmoji}</span>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">點擊更換照片</p>
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
          />

          <Select
            label="物種"
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
          />

          <Select
            label="性別"
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
          />

          <Textarea
            label="病史"
            value={form.medicalHistory}
            onChange={(e) => setForm((prev) => ({ ...prev, medicalHistory: e.target.value }))}
          />

          <Button size="lg" className="w-full" onClick={handleSave} loading={saving}>
            儲存變更
          </Button>
        </div>
      )}
    </div>
  )
}
