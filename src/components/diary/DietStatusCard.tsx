'use client'

import { useEffect, useState } from 'react'

// 今日飲食狀態組件
// 三個 Tab：全部按計畫 / 少餐或換食 / 依醫囑禁食
// 「少餐或換食」tab 需從 GET /api/meal-plans?petId=&date= 取得配餐計畫

type MealTab = 'all' | 'reduced' | 'forbidden'

const MEAL_SESSION_LABEL: Record<string, string> = {
  morning: '早餐',
  noon: '午餐',
  evening: '晚餐',
}

const MEAL_STATUS_OPTIONS = [
  { value: 'done', label: '吃完' },
  { value: 'refused', label: '拒食/沒餵' },
  { value: 'outside', label: '外食替換' },
] as const

interface MealPlanItem {
  id: string
  session: string
  productId: string | null
  customName: string | null
  quantity: number
  unit: string
  product?: { id: string; name: string; brand: string | null } | null
}

interface MealPlan {
  id: string
  items: MealPlanItem[]
}

interface DietValue {
  tab: MealTab
  mealStatuses: Record<string, string>
}

interface Props {
  petId: string
  date: string
  value: DietValue
  onChange: (val: DietValue) => void
}

export default function DietStatusCard({ petId, date, value, onChange }: Props) {
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)

  // 當切到「少餐或換食」tab 時才取配餐計畫
  useEffect(() => {
    if (value.tab !== 'reduced') return
    if (plan) return  // 已載入，不重複請求
    setLoadingPlan(true)
    fetch(`/api/meal-plans?petId=${petId}&date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MealPlan | null) => setPlan(data))
      .catch(() => setPlan(null))
      .finally(() => setLoadingPlan(false))
  }, [value.tab, petId, date, plan])

  function setTab(tab: MealTab) {
    onChange({ ...value, tab })
  }

  function setMealStatus(session: string, status: string) {
    onChange({
      ...value,
      mealStatuses: { ...value.mealStatuses, [session]: status },
    })
  }

  const sessions = Object.keys(MEAL_SESSION_LABEL)

  return (
    <div>
      <h3 className="font-bold text-[#2C1810] mb-3">今日飲食狀態</h3>

      {/* Segmented control */}
      <div className="flex bg-slate-100 rounded-full p-1 mb-4">
        {(
          [
            { key: 'all', label: '全部按計畫' },
            { key: 'reduced', label: '少餐或換食' },
            { key: 'forbidden', label: '依醫囑禁食' },
          ] as const
        ).map((tab) => {
          const isActive = value.tab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-colors text-center ${
                isActive
                  ? 'bg-[#2C1810] text-white shadow-sm'
                  : 'text-[#8B7355]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 全部按計畫 */}
      {value.tab === 'all' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 text-center py-2">今日照計畫進行</p>
        </div>
      )}

      {/* 依醫囑禁食 */}
      {value.tab === 'forbidden' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 text-center py-2 leading-relaxed">
            依醫囑禁食模式，請注意觀察寵物狀態
          </p>
        </div>
      )}

      {/* 少餐或換食 */}
      {value.tab === 'reduced' && (
        <div className="space-y-3">
          {loadingPlan && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#C4714A] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loadingPlan &&
            sessions.map((session) => {
              const sessionItems = plan?.items.filter((item) => item.session === session) ?? []
              const currentStatus = value.mealStatuses[session] ?? null

              return (
                <div
                  key={session}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
                >
                  {/* 時段標題 + 狀態按鈕 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-[#2C1810] text-sm">
                      {MEAL_SESSION_LABEL[session]}
                    </span>
                    <div className="flex gap-1.5">
                      {MEAL_STATUS_OPTIONS.map((opt) => {
                        const isActive = currentStatus === opt.value
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setMealStatus(session, opt.value)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-[#C4714A] text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 計畫商品列表 */}
                  {sessionItems.length === 0 ? (
                    <p className="text-xs text-slate-400">此時段無計畫商品</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {sessionItems.map((item) => {
                        const name =
                          item.product?.name ??
                          item.customName ??
                          '未命名商品'
                        return (
                          <li
                            key={item.id}
                            className="flex items-center gap-2 text-sm text-slate-700"
                          >
                            <span className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0 bg-white" />
                            <span>
                              {name}{' '}
                              <span className="text-xs text-slate-400">
                                {item.quantity}
                                {item.unit}
                              </span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
