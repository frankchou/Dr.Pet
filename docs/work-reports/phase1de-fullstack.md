# Phase 1-D / 1-E 全端工作報告

**角色：** 全端工程師
**日期：** 2026-06-04
**範圍：** 1-D 共享資料即時同步（輪詢 + 視窗聚焦重抓）、1-E QRCode 保留當備用
**約束：** 不引入 SWR/React Query；不 commit；不動三份系統文件；不碰正式庫。

---

## 1-D 共享資料即時同步

### Hook 設計：`src/hooks/usePollingRefresh.ts`

簽名：`usePollingRefresh(refresh: () => void, intervalMs = 25000): void`

行為：
- 每 `intervalMs`（預設 25 秒）呼叫一次 `refresh`。
- `visibilitychange`：分頁切回可見 → 立即 `refresh` 並（重新）啟動輪詢；分頁隱藏 → **暫停輪詢**（清掉 interval），背景分頁不浪費請求。
- `window focus` → 立即 `refresh`。
- 卸載時清掉 interval 與兩個 listener。

防無限重抓 / 重繪的設計：
- 用 `refreshRef`（useRef）保存最新的 `refresh`，listener / interval 內永遠取最新版本；effect 相依只有 `intervalMs`，因此 `refresh` 參考即使改變也不會重建計時器/監聽器。
- 仍要求呼叫端用 `useCallback` 穩定 `refresh`（雖然 hook 本身已用 ref 隔離，但穩定參考可避免子層多餘重算）。
- 起始時若分頁已是隱藏狀態則不啟動輪詢，待切回可見再啟動。

### 套用頁面

| 頁面 | 重抓內容 | 備註 |
|------|----------|------|
| 首頁 `src/app/page.tsx` | 寵物列表（`/api/pets`）+ 當前毛孩當日健康指標 / 餐數（`/api/health-metrics`、`/api/usages`） | 把原本兩個 inline `useEffect` 抽成 `fetchPets` / `fetchPetDaily`（useCallback），`refreshShared` 同時呼叫兩者。`fetchPets` 改用 `setCurrentPetId(prev => ...)` 函式式更新，避免重抓時把使用者已切換的當前毛孩重設掉。 |
| 日誌 `src/app/diary/page.tsx` | 月曆/週曆「有紀錄圓點」（`recordedDates`）+ 月健康總覽（`MonthHealthOverview`） | `refreshShared` 用 `setDatesRefreshKey(k => k + 1)` 觸發既有的 dates 聚合 effect，並把 `datesRefreshKey` 以新 `refreshKey` prop 傳入 `MonthHealthOverview` 連動重抓。 |
| 飲食 `src/app/diet/page.tsx` | 今日配餐計畫（`/api/meal-plans`） | 既有 `fetchPlan` 加 `silent` 參數，輪詢重抓時不顯示整頁 spinner，避免閃爍；寵物基本資訊（較少變動）不重抓。 |
| 寵物詳情 `src/app/pet/[id]/page.tsx` | 毛孩資料（`/api/pets/[id]`） | 抽成 `fetchPet(silent)`；**編輯中（`editing`）時跳過輪詢**，避免覆寫使用者尚未儲存的表單。 |

### 子元件改動

`src/components/diary/MonthHealthOverview.tsx`
- Props 新增 `refreshKey?: number`，加進「整月 logs」與「單日 log」兩個 fetch effect 的相依。
- 兩個 effect 各用一個 `lastFetchSigRef` / `lastDaySigRef`：只有 `petId`/`yearMonth`（或 `date`）真的改變才顯示載入狀態 / 先清空；純 `refreshKey` 變動（輪詢）時靜默更新，避免每 25 秒閃一次 spinner 或讓單日摘要短暫消失。

### 刻意跳過的部分（含原因）

- **日誌頁 `HealthLogSection`（週曆模式的當日健康編輯區）未納入輪詢。**
  該元件是使用者即時編輯的表單，採 debounce（1 秒）自動存檔。若被輪詢以伺服器資料覆寫，會清掉使用者尚未送出的編輯內容。共享同步的價值在「唯讀彙整」（圓點、月總覽），故只刷新那些，編輯表單維持以使用者輸入為準。已在 `diary/page.tsx` 程式碼註解說明。
- **飲食頁寵物基本資訊（`fetchPetInfo`）未納入輪詢。** 寵物名/物種/過敏等極少變動，且只供 AI 分析帶參數，無需高頻同步；只刷新會頻繁變動的今日配餐。
- **寵物詳情頁編輯中不刷新**（見上表備註），同理避免覆寫編輯。

---

## 1-E QRCode 保留當備用

檔案：`src/app/settings/page.tsx`（`CoOwnerSection`）

調整（功能未移除，只調動線/文案層級）：
1. **Email 為主、QR 退為次要：** 原本邀請成功後會「自動彈出 QR Code Modal」，改為**寄信成功時不自動彈出**；只有在 `emailSent === false`（寄信失敗）時才自動顯示 QR 當備援。平時要當面分享，仍可點待接受邀請列旁既有的 QR 小按鈕開啟。
2. **新增動線說明文案**（邀請輸入框下方）：說明「輸入 email 會寄出邀請信」為主，並指引「若想當面分享，可點待接受邀請旁的 QR 圖示讓對方掃描」，次要備用語氣。
3. **QR Modal 文案改寫**：標題由「掃描加入共同飼主」改為「**或讓對方當面掃描**」，並加副標「**邀請信已寄出**；若對方就在身邊，也可直接掃描下方 QR Code 加入」，呼應「邀請信已寄出」主動線。
4. **Toast 文案微調**：寄信失敗時提示由「可改用 QR Code 分享」改為「可改用下方 QR Code 當備用」。

QR Code 產生與顯示功能（`QRCode.toDataURL`、`handleShowQr`、Modal）全部保留，未刪除。

---

## 驗證方式

- `npx tsc --noEmit`：**通過，無型別錯誤。**
- 靜態檢視：
  - hook 的 effect 相依僅 `intervalMs`，`refresh` 經 ref 隔離 → 不會因父層重繪而重建計時器，無無限重抓風險。
  - 各頁 `refreshShared` 皆 `useCallback` 包裝、相依正確。
  - 輪詢路徑皆走 silent / refreshKey 靜默更新，不觸發整頁或區塊 spinner 閃爍。
- 尚未做（屬 QA / 實機）：多分頁同時開啟驗證「失焦停、聚焦補」實際行為、A/B 兩帳號跨端同步的端到端驗收（屬 1-F）。

## 動到的檔案
- 新增 `src/hooks/usePollingRefresh.ts`
- 修改 `src/app/page.tsx`
- 修改 `src/app/diary/page.tsx`
- 修改 `src/app/diet/page.tsx`
- 修改 `src/app/pet/[id]/page.tsx`
- 修改 `src/components/diary/MonthHealthOverview.tsx`
- 修改 `src/app/settings/page.tsx`
