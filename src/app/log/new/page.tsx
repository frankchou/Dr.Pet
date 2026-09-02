'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { Input, Textarea, Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import type { Pet, Product } from '@/types'
import type { LookupResult } from '@/app/api/products/lookup/route'

const PRODUCT_TYPE_OPTIONS = [
  { value: 'feed', label: '飼料' },
  { value: 'can', label: '罐頭' },
  { value: 'snack', label: '零食' },
  { value: 'supplement', label: '保健品' },
  { value: 'dental', label: '牙膏牙粉' },
  { value: 'shampoo', label: '洗毛精' },
  { value: 'other', label: '其他' },
]
const FREQUENCY_OPTIONS = [
  { value: '', label: '選擇頻率' },
  { value: '每天一次', label: '每天一次' },
  { value: '每天兩次', label: '每天兩次' },
  { value: '每天三次', label: '每天三次' },
  { value: '隔天一次', label: '隔天一次' },
  { value: '每週一次', label: '每週一次' },
  { value: '不定期', label: '不定期' },
]
const AMOUNT_OPTIONS = [
  { value: '', label: '選擇用量' },
  { value: '少量', label: '少量' },
  { value: '正常量', label: '正常量' },
  { value: '多量', label: '多量' },
  { value: '依指示', label: '依指示' },
]

const RISK_BADGE: Record<string, string> = {
  toxic:   'bg-red-500 text-white',
  warning: 'bg-orange-500 text-white',
  caution: 'bg-yellow-400 text-white',
  safe:    'bg-green-500 text-white',
}
const RISK_LABEL: Record<string, string> = {
  toxic: '有毒', warning: '警示', caution: '需注意', safe: '安全',
}

function NewLogForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const [step, setStep] = useState<1 | 2>(1)
  const [pets, setPets] = useState<Pet[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState('')
  const [lookupError, setLookupError] = useState('')

  const [productForm, setProductForm] = useState({ type: 'feed', name: '', brand: '', variant: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)

  const [usageForm, setUsageForm] = useState({
    petId: '',
    date: dateParam,
    frequency: '', amountLevel: '', notes: '',
  })
  const [addToList, setAddToList] = useState<'none' | 'fixed' | 'trial'>('none')
  const [trialReason, setTrialReason] = useState('')

  useEffect(() => {
    fetch('/api/pets').then((r) => r.json()).then((data: Pet[]) => {
      // 401（未登入 / session 過期）回傳的是 { error }，先正規化避免當成陣列操作
      const list = Array.isArray(data) ? data : []
      setPets(list)
      if (list.length > 0) setUsageForm((p) => ({ ...p, petId: list[0].id }))
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      fetch(`/api/products?search=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json()).then(setProducts).catch(console.error)
    } else { setProducts([]) }
  }, [searchQuery])

  // 產品資訊改變時清除查詢結果
  useEffect(() => {
    setLookupResult(null)
    setLookupError('')
  }, [productForm.name, productForm.type, productForm.brand])

  const handleLookup = async () => {
    if (!productForm.name.trim()) return
    setLookupLoading(true)
    setLookupError('')
    setLookupResult(null)
    try {
      const res = await fetch('/api/products/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name, type: productForm.type,
          brand: productForm.brand, variant: productForm.variant,
          petId: usageForm.petId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setLookupError(data.error || '查詢失敗'); return }
      setLookupResult(data)
    } catch { setLookupError('網路錯誤，請稍後再試') }
    finally { setLookupLoading(false) }
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.name.trim()) { setError('請輸入產品名稱'); return }
    setStep(2); setError('')
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usageForm.petId) { setError('請先建立寵物檔案'); return }
    setLoading(true); setError('')
    try {
      let productId: string
      if (selectedProduct) {
        productId = selectedProduct.id
      } else {
        const productPayload = {
          ...productForm,
          ingredientText: lookupResult?.raw_ingredient_text || null,
          ingredientJson: lookupResult ? {
            ingredients: lookupResult.ingredients,
            protein_sources: lookupResult.protein_sources,
            additives: lookupResult.additives,
            functional_ingredients: lookupResult.functional_ingredients,
          } : null,
        }
        const productRes = await fetch('/api/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload),
        })
        if (!productRes.ok) throw new Error('建立產品失敗')
        productId = (await productRes.json()).id
      }
      const usageRes = await fetch('/api/usages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...usageForm, productId }),
      })
      if (!usageRes.ok) throw new Error('建立記錄失敗')
      // Optionally add to pet's product list
      if (addToList !== 'none' && usageForm.petId) {
        await fetch('/api/pet-products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            petId: usageForm.petId,
            productId,
            listType: addToList,
            trialReason: addToList === 'trial' ? trialReason : null,
          }),
        })
      }
      router.push('/log')
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗')
    } finally { setLoading(false) }
  }

  const impactSummary = lookupResult?.impact
  const hasRisk = impactSummary && (impactSummary.toxicCount + impactSummary.warningCount) > 0
  const currentPetName = pets.find((p) => p.id === usageForm.petId)?.name || '寵物'

  return (
    <div>
      <PageHeader title={step === 1 ? '新增食品/用品' : '記錄使用詳情'} backHref={step === 1 ? '/log' : undefined} />
      <div className="px-4 py-2 flex gap-2">
        {[1, 2].map((s) => <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-[#4F7CFF]' : 'bg-gray-200'}`} />)}
      </div>
      {error && <div className="mx-4 mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>}

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="px-4 py-4 space-y-4 pb-24">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜尋已有產品</label>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="輸入名稱搜尋..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#4F7CFF]" />
            {products.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {products.map((p) => (
                  <button key={p.id} type="button"
                    onClick={() => { setSelectedProduct(p); setProductForm({ type: p.type, name: p.name, brand: p.brand || '', variant: p.variant || '' }); setSearchQuery(''); setProducts([]) }}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-[#1a1a2e]">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.brand} · {p.type}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-sm font-medium text-blue-700">已選擇：{selectedProduct.name}</p>
              <p className="text-xs text-blue-400 mt-0.5">{selectedProduct.brand}</p>
              <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs text-blue-400 mt-1 underline">取消選擇，改為新增</button>
            </div>
          ) : (
            <>
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="mx-2 text-xs text-gray-400">或新增產品</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <Select label="產品類型 *" value={productForm.type}
                onChange={(e) => setProductForm((p) => ({ ...p, type: e.target.value }))}
                options={PRODUCT_TYPE_OPTIONS} />
              <Input label="產品名稱 *" value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例如：無穀鮭魚主食罐" />
              <Input label="品牌" value={productForm.brand}
                onChange={(e) => setProductForm((p) => ({ ...p, brand: e.target.value }))}
                placeholder="例如：ZiwiPeak" />
              <Input label="規格（選填）" value={productForm.variant}
                onChange={(e) => setProductForm((p) => ({ ...p, variant: e.target.value }))}
                placeholder="例如：成犬配方、170g" />

              {/* AI 查詢按鈕 */}
              {productForm.name.trim().length >= 2 && !lookupResult && (
                <button type="button" onClick={handleLookup} disabled={lookupLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#4F7CFF] text-[#4F7CFF] text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-60"
                >
                  {lookupLoading ? (
                    <><div className="w-4 h-4 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin" />AI 查詢成分中（約 10 秒）...</>
                  ) : (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>AI 自動查詢成分與影響</>
                  )}
                </button>
              )}

              {lookupError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-xs">{lookupError}</div>}

              {/* ── AI 查詢結果 ── */}
              {lookupResult && (
                <div className="space-y-3">
                  <Card>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <span className="text-[#4F7CFF]">✨</span>
                        <div>
                          <p className="text-xs font-semibold text-[#4F7CFF]">
                            AI 查詢完成{lookupResult.is_estimate ? ' (AI 估計值，建議上傳成分表確認)' : ''}
                          </p>
                          {lookupResult.product_description && (
                            <p className="text-xs text-gray-500 mt-0.5">{lookupResult.product_description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 成分標籤 */}
                  {lookupResult.ingredients.length > 0 && (
                    <Card>
                      <CardContent>
                        <p className="text-xs font-semibold text-gray-500 mb-2">查詢到的成分</p>
                        {lookupResult.protein_sources.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] text-gray-400 mb-1">蛋白質來源</p>
                            <div className="flex flex-wrap gap-1">
                              {lookupResult.protein_sources.map((s, i) => <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{s}</span>)}
                            </div>
                          </div>
                        )}
                        {lookupResult.functional_ingredients.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] text-gray-400 mb-1">功能性成分</p>
                            <div className="flex flex-wrap gap-1">
                              {lookupResult.functional_ingredients.map((s, i) => <span key={i} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{s}</span>)}
                            </div>
                          </div>
                        )}
                        {lookupResult.additives.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-400 mb-1">添加劑</p>
                            <div className="flex flex-wrap gap-1">
                              {lookupResult.additives.map((s, i) => <span key={i} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{s}</span>)}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* 對寵物影響 */}
                  {impactSummary && impactSummary.matched.length > 0 && (
                    <Card>
                      <CardContent>
                        <p className="text-xs font-semibold text-gray-500 mb-2">對 {currentPetName} 的影響</p>
                        <div className="grid grid-cols-4 gap-1 mb-3">
                          {[
                            { label: '有毒',   count: impactSummary.toxicCount,   color: 'text-red-600 bg-red-50' },
                            { label: '警示',   count: impactSummary.warningCount, color: 'text-orange-600 bg-orange-50' },
                            { label: '需注意', count: impactSummary.cautionCount, color: 'text-yellow-600 bg-yellow-50' },
                            { label: '安全',   count: impactSummary.safeCount,    color: 'text-green-600 bg-green-50' },
                          ].map((s) => (
                            <div key={s.label} className={`rounded-lg py-1.5 text-center ${s.color}`}>
                              <p className="font-bold text-base leading-none">{s.count}</p>
                              <p className="text-[10px]">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* 有毒/警示先列 */}
                        {impactSummary.matched.filter((m) => m.riskLevel === 'toxic' || m.riskLevel === 'warning').map((m, i) => (
                          <div key={i} className="mb-2 p-2.5 bg-red-50 rounded-xl border border-red-200">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${RISK_BADGE[m.riskLevel]}`}>{RISK_LABEL[m.riskLevel]}</span>
                              <span className="text-xs font-semibold text-[#1a1a2e]">{m.displayName}</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{m.effect}</p>
                          </div>
                        ))}

                        {/* 其他成分折疊 */}
                        <details className="mt-1">
                          <summary className="text-xs text-[#4F7CFF] cursor-pointer select-none">
                            查看全部 {impactSummary.matched.length} 項成分分析 ▸
                          </summary>
                          <div className="mt-2 space-y-2">
                            {impactSummary.matched.filter((m) => m.riskLevel !== 'toxic' && m.riskLevel !== 'warning').map((m, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-bold mt-0.5 ${RISK_BADGE[m.riskLevel]}`}>{RISK_LABEL[m.riskLevel]}</span>
                                <div>
                                  <p className="text-xs font-medium text-[#1a1a2e]">{m.displayName}</p>
                                  <p className="text-[11px] text-gray-500 leading-relaxed">{m.effect}</p>
                                  {m.tip && <p className="text-[11px] text-[#4F7CFF] mt-0.5">💡 {m.tip}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>

                        {/* 補充建議 */}
                        {impactSummary.supplements.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 mb-1.5">建議補充</p>
                            {impactSummary.supplements.slice(0, 3).map((s, i) => (
                              <div key={i} className="flex items-start gap-1.5 mb-1.5">
                                <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${s.priority === 'high' ? 'bg-red-500' : s.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'}`} />
                                <div>
                                  <p className="text-xs font-medium text-[#1a1a2e]">{s.name}</p>
                                  <p className="text-[11px] text-gray-500">{s.reason}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <button type="button" onClick={() => setLookupResult(null)} className="text-xs text-gray-400 underline w-full text-center">重新查詢</button>
                </div>
              )}
            </>
          )}

          {hasRisk && (
            <div className="bg-red-500 text-white rounded-2xl p-3 text-xs font-medium">
              ⚠️ 此產品含有需注意的成分，請詳閱上方分析再決定是否使用
            </div>
          )}

          <Button type="submit" size="lg" className="w-full">下一步：記錄使用詳情</Button>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="px-4 py-4 space-y-4 pb-24">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">選擇的產品</p>
            <p className="font-medium text-sm text-[#1a1a2e]">{productForm.brand ? `${productForm.brand} ` : ''}{productForm.name}</p>
            {lookupResult && <p className="text-xs text-[#4F7CFF] mt-0.5">✓ AI 已查詢 {lookupResult.ingredients.length} 種成分並儲存</p>}
          </div>
          {pets.length > 1 && (
            <Select label="選擇寵物" value={usageForm.petId}
              onChange={(e) => setUsageForm((p) => ({ ...p, petId: e.target.value }))}
              options={pets.map((p) => ({ value: p.id, label: p.name }))} />
          )}
          <Input label="日期 *" type="date" value={usageForm.date} onChange={(e) => setUsageForm((p) => ({ ...p, date: e.target.value }))} />
          <Select label="使用頻率" value={usageForm.frequency} onChange={(e) => setUsageForm((p) => ({ ...p, frequency: e.target.value }))} options={FREQUENCY_OPTIONS} />
          <Select label="用量" value={usageForm.amountLevel} onChange={(e) => setUsageForm((p) => ({ ...p, amountLevel: e.target.value }))} options={AMOUNT_OPTIONS} />
          <Textarea label="備註" value={usageForm.notes} onChange={(e) => setUsageForm((p) => ({ ...p, notes: e.target.value }))} placeholder="例如：寵物的反應、是否喜歡吃..." />

          {/* Add to product list */}
          <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">加入產品清單？</p>
            <div className="flex gap-2">
              {([
                { value: 'none',  label: '不加入' },
                { value: 'fixed', label: '🏠 固定清單' },
                { value: 'trial', label: '🧪 試用清單' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAddToList(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    addToList === opt.value
                      ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {addToList === 'trial' && (
              <input
                type="text"
                value={trialReason}
                onChange={(e) => setTrialReason(e.target.value)}
                placeholder="試用原因（選填）：例如改善皮膚問題…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40"
              />
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>上一步</Button>
            <Button type="submit" size="lg" className="flex-1" loading={loading}>儲存記錄</Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function NewLogPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400">載入中...</div>}>
      <NewLogForm />
    </Suspense>
  )
}
