'use client'
import { useState } from 'react'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { parseJson } from '@/lib/utils'

export interface NutritionalFact { name: string; value: number; unit: string }
export interface IngredientJson {
  ingredients?: string[]
  protein_sources?: string[]
  additives?: string[]
  functional_ingredients?: string[]
  nutritional_facts?: NutritionalFact[]
}
export interface ProductForEdit {
  id: string
  type: string
  name: string
  brand?: string | null
  ingredientText?: string | null
  ingredientJson?: string | null
  photos?: string | null   // JSON string of stored photo URLs
}

const PRODUCT_TYPES = [
  { value: 'feed',       label: '飼料' },
  { value: 'can',        label: '罐頭/濕食' },
  { value: 'snack',      label: '零食/點心' },
  { value: 'supplement', label: '保健品' },
  { value: 'dental',     label: '潔牙產品' },
  { value: 'shampoo',    label: '洗毛精/護膚' },
  { value: 'other',      label: '其他' },
]

function TagEditor({
  tags, onAdd, onRemove, placeholder, color = 'bg-gray-100 text-gray-700',
}: {
  tags: string[]
  onAdd: (t: string) => void
  onRemove: (i: number) => void
  placeholder: string
  color?: string
}) {
  const [input, setInput] = useState('')
  const commit = () => {
    const v = input.trim()
    if (v) { onAdd(v); setInput('') }
  }
  return (
    <div className="flex flex-wrap gap-1 border border-gray-200 rounded-xl p-2 min-h-[38px]">
      {tags.map((tag, i) => (
        <span key={i} className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs ${color}`}>
          {tag}
          <button type="button" onClick={() => onRemove(i)} className="ml-0.5 text-current opacity-50 hover:opacity-100 leading-none">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : '+新增'}
        className="flex-1 min-w-[80px] text-xs outline-none bg-transparent placeholder:text-gray-300"
      />
    </div>
  )
}

export default function ProductEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: ProductForEdit
  onClose: () => void
  onSaved: (updated: ProductForEdit) => void
}) {
  const parsed = parseJson<IngredientJson>(product.ingredientJson ?? '', {})
  const photoUrls = parseJson<string[]>(product.photos ?? '[]', [])

  const [name, setName]     = useState(product.name)
  const [brand, setBrand]   = useState(product.brand || '')
  const [type, setType]     = useState(product.type)
  const [proteins, setProteins]       = useState<string[]>(parsed.protein_sources || [])
  const [functionals, setFunctionals] = useState<string[]>(parsed.functional_ingredients || [])
  const [additives, setAdditives]     = useState<string[]>(parsed.additives || [])
  const [ingredients, setIngredients] = useState<string[]>(parsed.ingredients || [])
  const [rawText, setRawText]         = useState(product.ingredientText || '')
  const [facts, setFacts]             = useState<NutritionalFact[]>(parsed.nutritional_facts || [])
  const [saving, setSaving]           = useState(false)
  const [reExtracting, setReExtracting] = useState(false)
  const [error, setError]             = useState('')
  const [reExtractMsg, setReExtractMsg] = useState('')

  const addFact = () => setFacts((f) => [...f, { name: '', value: 0, unit: '%' }])
  const removeFact = (i: number) => setFacts((f) => f.filter((_, idx) => idx !== i))
  const updateFact = (i: number, key: keyof NutritionalFact, val: string | number) =>
    setFacts((f) => f.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  // Re-extract nutritional data from the stored product photo
  const handleReExtract = async () => {
    if (!photoUrls[0]) return
    setReExtracting(true); setError(''); setReExtractMsg('')
    try {
      // Fetch the stored image and send it to the extract API
      const imgRes = await fetch(photoUrls[0])
      if (!imgRes.ok) throw new Error('無法讀取圖片')
      const blob = await imgRes.blob()
      const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
      const fd = new FormData()
      fd.append('file', file)
      fd.append('docType', 'product')
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('AI 萃取失敗')
      const { extracted } = await res.json()
      // Apply extracted data (only overwrite non-empty fields)
      if (extracted.protein_sources?.length)       setProteins(extracted.protein_sources)
      if (extracted.functional_ingredients?.length) setFunctionals(extracted.functional_ingredients)
      if (extracted.additives?.length)             setAdditives(extracted.additives)
      if (extracted.ingredients?.length)           setIngredients(extracted.ingredients)
      if (extracted.raw_text)                      setRawText(extracted.raw_text)
      if (extracted.nutritional_facts?.length)     setFacts(extracted.nutritional_facts)
      const factCount = extracted.nutritional_facts?.length || 0
      setReExtractMsg(factCount > 0
        ? `✅ 已從圖片萃取 ${factCount} 項營養素數據`
        : '⚠️ 未在圖片中偵測到保證分析值，其他成分資料已更新'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '萃取失敗')
    } finally {
      setReExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('請輸入產品名稱'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || null,
          type,
          ingredientText: rawText || null,
          ingredientJson: {
            ingredients,
            protein_sources: proteins,
            additives,
            functional_ingredients: functionals,
            nutritional_facts: facts.filter((f) => f.name.trim()),
          },
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      const updated = await res.json()
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] mx-auto bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-[#1a1a2e]">修改產品資料</p>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        <div className="px-4 py-4 space-y-4 pb-8">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Re-extract from stored photo */}
          {photoUrls.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrls[0]} alt="產品圖片" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-blue-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-800">已有儲存的產品圖片</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">可重新從圖片萃取成分與營養數據</p>
                </div>
              </div>
              {reExtractMsg && (
                <p className="text-xs text-blue-700 font-medium">{reExtractMsg}</p>
              )}
              <button
                type="button"
                onClick={handleReExtract}
                disabled={reExtracting}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#4F7CFF] text-white rounded-xl text-xs font-medium disabled:opacity-60 transition-opacity"
              >
                {reExtracting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AI 萃取中…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    從圖片重新萃取成分與營養數據
                  </>
                )}
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Input label="產品名稱 *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="品牌" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <Select label="類型" value={type} onChange={(e) => setType(e.target.value)} options={PRODUCT_TYPES} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">蛋白質來源</p>
            <TagEditor tags={proteins}
              onAdd={(t) => setProteins((p) => [...p, t])}
              onRemove={(i) => setProteins((p) => p.filter((_, idx) => idx !== i))}
              placeholder="輸入後按 Enter" color="bg-blue-100 text-blue-700" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">功能性成分</p>
            <TagEditor tags={functionals}
              onAdd={(t) => setFunctionals((p) => [...p, t])}
              onRemove={(i) => setFunctionals((p) => p.filter((_, idx) => idx !== i))}
              placeholder="輸入後按 Enter" color="bg-green-100 text-green-700" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">添加劑</p>
            <TagEditor tags={additives}
              onAdd={(t) => setAdditives((p) => [...p, t])}
              onRemove={(i) => setAdditives((p) => p.filter((_, idx) => idx !== i))}
              placeholder="輸入後按 Enter" color="bg-orange-100 text-orange-700" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">全部成分（其他）</p>
            <TagEditor tags={ingredients}
              onAdd={(t) => setIngredients((p) => [...p, t])}
              onRemove={(i) => setIngredients((p) => p.filter((_, idx) => idx !== i))}
              placeholder="輸入後按 Enter" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">營養成分分析值</p>
              <button type="button" onClick={addFact}
                className="text-xs text-[#4F7CFF] font-medium">+ 新增</button>
            </div>
            {facts.length > 0 && (
              <div className="space-y-1.5">
                {facts.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#4F7CFF]"
                      value={f.name}
                      onChange={(e) => updateFact(i, 'name', e.target.value)}
                      placeholder="項目名稱"
                    />
                    <input
                      type="number" step="0.1"
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#4F7CFF]"
                      value={f.value}
                      onChange={(e) => updateFact(i, 'value', parseFloat(e.target.value) || 0)}
                    />
                    <select
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#4F7CFF]"
                      value={f.unit}
                      onChange={(e) => updateFact(i, 'unit', e.target.value)}
                    >
                      <option value="%">%</option>
                      <option value="mg/kg">mg/kg</option>
                      <option value="g/kg">g/kg</option>
                      <option value="IU/kg">IU/kg</option>
                    </select>
                    <button type="button" onClick={() => removeFact(i)}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">原始成分文字</p>
            <Textarea value={rawText} onChange={(e) => setRawText(e.target.value)}
              placeholder="成分標示原始文字" />
          </div>

          <Button className="w-full" size="lg" onClick={handleSave} loading={saving}>儲存變更</Button>
        </div>
      </div>
    </div>
  )
}
