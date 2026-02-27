'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Select, Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import type { Pet } from '@/types'

type DocType = 'product' | 'medical'

const PRODUCT_TYPE_OPTIONS = [
  { value: 'feed',       label: '飼料' },
  { value: 'can',        label: '罐頭 / 濕食' },
  { value: 'snack',      label: '零食 / 點心' },
  { value: 'supplement', label: '保健品' },
  { value: 'dental',     label: '潔牙產品' },
  { value: 'shampoo',    label: '洗毛精 / 護膚' },
  { value: 'other',      label: '其他' },
]

interface NutritionalFact { name: string; value: number; unit: string }

interface ProductExtraction {
  ingredients?: string[]
  protein_sources?: string[]
  additives?: string[]
  functional_ingredients?: string[]
  nutritional_facts?: NutritionalFact[]
  raw_text?: string
}
interface MedicalExtraction {
  date?: string; reason?: string; diagnosis?: string[]
  medications?: string[]; recommendations?: string[]; raw_text?: string
}

// ─── Tag editor ─────────────────────────────────────────────────────────────
function TagEditor({
  tags, onAdd, onRemove, placeholder, color = 'bg-gray-100 text-gray-700',
}: {
  tags: string[]; onAdd: (t: string) => void; onRemove: (i: number) => void
  placeholder: string; color?: string
}) {
  const [input, setInput] = useState('')
  const commit = () => { const v = input.trim(); if (v) { onAdd(v); setInput('') } }
  return (
    <div className="flex flex-wrap gap-1 border border-gray-200 rounded-xl p-2 min-h-[38px] bg-white">
      {tags.map((tag, i) => (
        <span key={i} className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs ${color}`}>
          {tag}
          <button type="button" onClick={() => onRemove(i)} className="ml-0.5 opacity-60 hover:opacity-100 leading-none">×</button>
        </span>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
        onBlur={commit} placeholder={tags.length === 0 ? placeholder : '+ 新增'}
        className="flex-1 min-w-[80px] text-xs outline-none bg-transparent placeholder:text-gray-300" />
    </div>
  )
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pets, setPets]                   = useState<Pet[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [docType, setDocType]             = useState<DocType>('product')
  const [imageFile, setImageFile]         = useState<File | null>(null)
  const [imagePreview, setImagePreview]   = useState<string | null>(null)
  const [extracting, setExtracting]       = useState(false)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')

  // Product form
  const [productName, setProductName] = useState('')
  const [productType, setProductType] = useState('feed')

  // Editable extraction state
  const [proteins, setProteins]       = useState<string[]>([])
  const [functionals, setFunctionals] = useState<string[]>([])
  const [additiveTags, setAdditiveTags] = useState<string[]>([])
  const [ingredientTags, setIngredientTags] = useState<string[]>([])
  const [facts, setFacts]             = useState<NutritionalFact[]>([])
  const [rawText, setRawText]         = useState('')
  const [hasExtracted, setHasExtracted] = useState(false)

  // Medical
  const [medExtracted, setMedExtracted] = useState<MedicalExtraction | null>(null)

  useEffect(() => {
    fetch('/api/pets').then((r) => r.json()).then((data: Pet[]) => {
      setPets(data)
      if (data.length > 0) setSelectedPetId(data[0].id)
    }).catch(console.error)
  }, [])

  const applyProductExtraction = (ext: ProductExtraction) => {
    setProteins(ext.protein_sources || [])
    setFunctionals(ext.functional_ingredients || [])
    setAdditiveTags(ext.additives || [])
    setIngredientTags(ext.ingredients || [])
    setFacts(ext.nutritional_facts || [])
    setRawText(ext.raw_text || '')
    setHasExtracted(true)
  }

  const handleExtract = useCallback(async (file: File, type: DocType = docType) => {
    setExtracting(true); setError('')
    setHasExtracted(false); setMedExtracted(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('docType', type)
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 分析失敗')
      if (type === 'product') applyProductExtraction(data.extracted as ProductExtraction)
      else setMedExtracted(data.extracted as MedicalExtraction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 分析失敗')
    } finally { setExtracting(false) }
  }, [docType])

  const handleFileSelect = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { setError('檔案過大，請上傳 20MB 以內的圖片'); return }
    setImageFile(file); setError(''); setSuccess('')
    setHasExtracted(false); setMedExtracted(null)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
    handleExtract(file)
  }

  const handleDocTypeChange = (newType: DocType) => {
    setDocType(newType)
    setHasExtracted(false); setMedExtracted(null)
    if (imageFile) handleExtract(imageFile, newType)
  }

  const addFact = () => setFacts((f) => [...f, { name: '', value: 0, unit: '%' }])
  const removeFact = (i: number) => setFacts((f) => f.filter((_, idx) => idx !== i))
  const updateFact = (i: number, key: keyof NutritionalFact, val: string | number) =>
    setFacts((f) => f.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  const handleSave = async () => {
    if (!selectedPetId) { setError('請先建立寵物檔案'); return }
    if (docType === 'product' && hasExtracted && !productName.trim()) { setError('請輸入產品名稱'); return }
    setSaving(true); setError('')
    try {
      let photoUrl = ''
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('圖片上傳失敗')
        photoUrl = (await uploadRes.json()).url
      }

      if (docType === 'product' && hasExtracted) {
        const prodRes = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: productType, name: productName.trim(),
            ingredientText: rawText || null,
            ingredientJson: {
              ingredients: ingredientTags, protein_sources: proteins,
              additives: additiveTags, functional_ingredients: functionals,
              nutritional_facts: facts.filter((f) => f.name.trim()),
            },
            photos: photoUrl ? [photoUrl] : [],
          }),
        })
        if (!prodRes.ok) throw new Error('產品儲存失敗')
        const prod = await prodRes.json()
        await fetch('/api/usages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petId: selectedPetId, productId: prod.id }),
        })
        setSuccess('成分已儲存！前往「分析」頁查看完整成分分析')
      } else {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            petId: selectedPetId, type: docType,
            photos: photoUrl ? [photoUrl] : [],
            extractedText: medExtracted?.raw_text || null,
            extractedStructured: medExtracted || null,
          }),
        })
        if (!res.ok) throw new Error('儲存失敗')
        setSuccess('文件已成功儲存！')
      }

      setImageFile(null); setImagePreview(null)
      setHasExtracted(false); setMedExtracted(null); setProductName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="上傳文件分析" />
      <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-700">⚠️ AI 提供的是資訊整理，不能替代獸醫診斷。</p>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {error   && <div className="bg-red-50   border border-red-200   rounded-xl p-3 text-red-600   text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-600 text-sm">{success}</div>}

        {pets.length > 1 && (
          <Select label="選擇寵物" value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            options={pets.map((p) => ({ value: p.id, label: p.name }))} />
        )}

        <Select label="文件類型" value={docType}
          onChange={(e) => handleDocTypeChange(e.target.value as DocType)}
          options={[{ value: 'product', label: '產品成分表 / 包裝' }, { value: 'medical', label: '醫療記錄 / 診斷書' }]}
        />

        {/* Upload zone */}
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleFileSelect(f) }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-[#4F7CFF] hover:bg-blue-50/30 transition-colors"
        >
          {imagePreview ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
              <p className="text-xs text-gray-400 mt-2">點擊更換照片</p>
            </div>
          ) : (
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mx-auto text-gray-300 mb-3">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <p className="text-sm text-gray-500 font-medium">點擊或拖曳照片</p>
              <p className="text-xs text-gray-400 mt-1">上傳後自動 AI 分析成分</p>
              <p className="text-xs text-gray-300 mt-0.5">JPG · PNG · WebP · 最大 20MB</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
        </div>

        {/* Analyzing */}
        {extracting && (
          <Card><CardContent>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1a1a2e]">AI 分析照片中...</p>
                <p className="text-xs text-gray-400">正在辨識{docType === 'product' ? '成分表' : '醫療記錄'}，請稍候</p>
              </div>
            </div>
          </CardContent></Card>
        )}

        {/* ── Product extraction — editable ───────────────────────────────── */}
        {docType === 'product' && hasExtracted && (
          <Card><CardContent>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-[#1a1a2e]">✅ AI 分析結果（可修正）</p>
              <button onClick={() => imageFile && handleExtract(imageFile)} className="text-xs text-[#4F7CFF]">重新分析</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">蛋白質來源</label>
                <TagEditor tags={proteins} onAdd={(t) => setProteins((p) => [...p, t])}
                  onRemove={(i) => setProteins((p) => p.filter((_, idx) => idx !== i))}
                  placeholder="點擊輸入，Enter 確認" color="bg-blue-100 text-blue-700" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">功能性成分</label>
                <TagEditor tags={functionals} onAdd={(t) => setFunctionals((p) => [...p, t])}
                  onRemove={(i) => setFunctionals((p) => p.filter((_, idx) => idx !== i))}
                  placeholder="點擊輸入，Enter 確認" color="bg-green-100 text-green-700" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">添加劑</label>
                <TagEditor tags={additiveTags} onAdd={(t) => setAdditiveTags((p) => [...p, t])}
                  onRemove={(i) => setAdditiveTags((p) => p.filter((_, idx) => idx !== i))}
                  placeholder="點擊輸入，Enter 確認" color="bg-orange-100 text-orange-700" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">其他成分</label>
                <TagEditor tags={ingredientTags} onAdd={(t) => setIngredientTags((p) => [...p, t])}
                  onRemove={(i) => setIngredientTags((p) => p.filter((_, idx) => idx !== i))}
                  placeholder="點擊輸入，Enter 確認" />
              </div>

              {/* Nutritional facts — editable rows */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500">營養成分分析值</label>
                  <button type="button" onClick={addFact} className="text-xs text-[#4F7CFF] font-medium">+ 新增列</button>
                </div>
                {facts.length > 0 ? (
                  <div className="space-y-1.5">
                    {facts.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <input className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#4F7CFF]"
                          value={f.name} onChange={(e) => updateFact(i, 'name', e.target.value)} placeholder="項目（如：粗蛋白）" />
                        <input type="number" step="0.1"
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#4F7CFF]"
                          value={f.value} onChange={(e) => updateFact(i, 'value', parseFloat(e.target.value) || 0)} />
                        <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#4F7CFF]"
                          value={f.unit} onChange={(e) => updateFact(i, 'unit', e.target.value)}>
                          <option value="%">%</option>
                          <option value="mg/kg">mg/kg</option>
                          <option value="g/kg">g/kg</option>
                          <option value="IU/kg">IU/kg</option>
                        </select>
                        <button type="button" onClick={() => removeFact(i)} className="text-gray-300 hover:text-red-400 text-xl leading-none">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1">未偵測到營養成分分析值，可手動新增</p>
                )}
              </div>

              {/* Raw text */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">原始文字（可修正）</label>
                <textarea value={rawText} onChange={(e) => setRawText(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#4F7CFF] resize-none"
                  rows={3} placeholder="成分標示原始文字" />
              </div>
            </div>
          </CardContent></Card>
        )}

        {/* Medical extraction results */}
        {docType === 'medical' && medExtracted && (
          <Card><CardContent>
            <p className="font-semibold text-sm text-[#1a1a2e] mb-3">✅ AI 分析結果</p>
            {[{ label: '就診日期', value: medExtracted.date }, { label: '就診原因', value: medExtracted.reason }].map((item) =>
              item.value ? (<div key={item.label} className="mb-2">
                <p className="text-xs font-medium text-gray-500">{item.label}</p>
                <p className="text-sm text-[#1a1a2e]">{item.value}</p>
              </div>) : null
            )}
            {[
              { label: '診斷', items: medExtracted.diagnosis, color: 'bg-red-100 text-red-700' },
              { label: '藥物', items: medExtracted.medications, color: 'bg-purple-100 text-purple-700' },
              { label: '建議', items: medExtracted.recommendations, color: 'bg-green-100 text-green-700' },
            ].map((section) => section.items?.length ? (
              <div key={section.label} className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">{section.label}</p>
                <div className="flex flex-wrap gap-1">
                  {section.items.map((item, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-xs ${section.color}`}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null)}
          </CardContent></Card>
        )}

        {/* Product save info */}
        {docType === 'product' && hasExtracted && (
          <Card><CardContent>
            <p className="text-sm font-semibold text-[#1a1a2e] mb-3">儲存為產品記錄</p>
            <div className="space-y-3">
              <Input label="產品名稱 *" value={productName}
                onChange={(e) => setProductName(e.target.value)} placeholder="例如：皇家成貓飼料" />
              <Select label="產品類型" value={productType}
                onChange={(e) => setProductType(e.target.value)} options={PRODUCT_TYPE_OPTIONS} />
            </div>
          </CardContent></Card>
        )}

        {/* Save button */}
        {(hasExtracted || medExtracted) && (
          <Button className="w-full" size="lg" onClick={handleSave} loading={saving}>
            儲存到{pets.find((p) => p.id === selectedPetId)?.name || '寵物'}的記錄
          </Button>
        )}
        {imageFile && !hasExtracted && !medExtracted && !extracting && (
          <Button variant="secondary" className="w-full" size="lg" onClick={handleSave} loading={saving}>
            直接儲存（不含分析）
          </Button>
        )}
      </div>
    </div>
  )
}
