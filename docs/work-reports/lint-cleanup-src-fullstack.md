# Lint 清理報告 — src（全端工程師）

## 目標
讓 `npm run lint` 全綠。起始：51 problems（29 error + 22 warning），垃圾目錄已由 eslint config 忽略。
最高原則：不改變任何執行期行為（尤其 SSR/hydration）。

## 最終結果
- `npx eslint src --ext .ts,.tsx` → **0 problems**
- `npm run lint` → **exit 0（全綠）**
- `npx tsc --noEmit` → **通過**
- `DATABASE_URL=file:./dev.db npm run build` → **✓ Compiled successfully，無 warning/error**

## 各規則處理

### 1. @typescript-eslint/no-unused-vars（16 → 0）
全部以「移除真正未使用的程式碼」處理，皆不影響功能：

- `src/app/diary/page.tsx`：此檔最大宗。`DietRecord` / `ProductLists` / `DietPlanActive` 三個元件
  及其支援狀態（`hasPlan` / `planStart` / `handleSetHasPlan` / `scrollToDiet`、相關 localStorage
  effect）只被一段**被註解掉的 JSX**（「功能移至飲食頁」）引用，屬死碼。
  - 移除該註解 JSX 區塊（符合慣例：不留 commented-out 區塊）。
  - 連帶移除只被上述元件使用的 `RecCard` / `AiProductCard` / `ProductCard` / `PlanBanner`，
    以及隨之變為未使用的 SVG icon shims（ChevronUp/Down/Right、Mic、Check、Plus、Search、
    AlertTriangle、FileText、CalendarIcon、Sparkles、CheckCircle、ShoppingCart、FlaskConical、
    BarChart3、Factory、PackageIcon、BoxIcon、Spinner）、常數（DANGER_WORDS、DIET_FILTERS、
    TYPE_META、TYPE_FILTER_MAP）、型別（Product、PetProductEntry）、helper（parseIngredientText、
    BounceDots）與 import（parseJson、productTypeLabel）。
  - 保留仍在使用者：`dietRef`（deep-link scroll）、`ChevronLeft` / `ChevronRight_Nav`（月/週曆）、
    `PetInfo`（fetch 型別）、`cn`。
  - 已驗證：被刪區塊內所有符號在區塊外皆無引用（grep 確認），tsc/build 通過。
- `src/app/page.tsx`：移除未使用 import `IngredientAnalysis`、未使用函式 `SvgHeart`、`HealthMetric`。
- `src/app/scan/page.tsx`：移除只寫不讀的 `pets` state 與對應 `setPets(data)`（值從未被讀取；
  該 fetch 真正輸出為 currentPetId / petName，畫面行為不變）。
- `src/app/settings/page.tsx`：移除未使用函式 `SvgMenu`。
- `src/components/diary/DiaryCalendar.tsx`：移除未使用的 `petId` prop 解構（eslint config 未設
  argsIgnorePattern，`_` 前綴不被忽略；該 prop 本就未被使用，移除解構不影響呼叫端）。

### 2. @next/next/no-html-link-for-pages（5 → 0）
`src/app/landing/page.tsx`：5 處導向 `/` 的站內路由 `<a href="/">` 改為 `next/link` 的 `<Link>`，
並新增 `import Link from 'next/link'`。
**未更動**頁內錨點連結（`href="#top"` / `#features` / `#how` / `#faq`），它們非站內路由，維持 `<a>`。

### 3. @next/next/no-img-element（5 → 0，全部以 eslint-disable 保留 `<img>`）
這 5 處皆為動態 / 遠端 / data URL 的小尺寸頭像或 QR，改用 next/image 需 remotePatterns 設定或
無法最佳化 data URL，且部分需 `referrerPolicy="no-referrer"`（next/image 不支援）。為不破壞顯示，
保留 `<img>` 並加 disable + 理由：
- `src/components/home/IngredientAnalysis.tsx:525` — 寵物頭像（上傳/data URL，48px 容器）。
- `src/components/layout/AppShell.tsx:144` — 使用者頭像（Google 遠端圖，需 no-referrer）。
- `src/components/layout/Sidebar.tsx:234` — 同上使用者頭像。
- `src/app/settings/page.tsx:251` — 共同飼主 Google 頭像（遠端 URL，32px）。
- `src/app/settings/page.tsx:356` — QR Code（前端即時產生 data URL，無從最佳化）。

（註：NutritionistChat、ClientShell:164、AcceptInviteClient、pet/[id]、pet/new、Sidebar:59 等
img disable 為**既有**，非本次新增，故原本就未列在錯誤清單。）

### 4. react-hooks/set-state-in-effect（22 → 0）
經逐一判斷，這些 setState 皆屬「與外部系統同步」的正當 effect，**無法**改惰性初始化或會造成
SSR/hydration mismatch，故維持 effect 並加 disable + 理由。共 **21 個 disable 指令**
（symptoms 一個 effect 內含兩處 setState 各加 1）：

- localStorage 水合（client only，惰性初始化會 hydration mismatch）：
  `nutrition/page.tsx`、`symptoms/page.tsx`(petId)、`AppShell.tsx`、`Sidebar.tsx`、`PetGuard.tsx`、
  `DietSwitchPlan.tsx`、`useDailyTasks.ts`、`useRecordParams.ts`。
- window.location（client only）：`ClientShell.tsx`(isPublicPath)。
- DOM 量測後決定狀態：`ClientShell.tsx`(canAgree，依 scrollHeight)。
- 外部 session 變更觸發：`ClientShell.tsx`(showDisclaimer)。
- router pathname 同步：`BottomNav.tsx`(清除 pendingHref)。
- fetch 載入旗標 / 切換來源時重置（與外部資料同步）：
  `diary/page.tsx`(DayDetail setLoading)、`symptoms/page.tsx`(setEntries/setLoading)、
  `products/page.tsx`、`DietStatusCard.tsx`、`HealthLogSection.tsx`、
  `MonthHealthOverview.tsx`(×3)、`CorrelationInsights.tsx`。

附帶說明：此規則對同一 effect 只回報第一個同步 setState，故每個 effect 通常一個 disable 即足夠；
原先誤放在第二個 setState 上的多餘指令已移除（避免 unused-disable warning）。

### 5. react-hooks/exhaustive-deps（1 → 0）— 真實修正，非 disable
`src/app/analysis/page.tsx`：`nutritionByProduct` 原本是 `(... ?? [])` 的邏輯運算式，每次 render
產生新陣列，導致依賴它的 `useMemo` 每次都重算。改用 `useMemo(() => ... ?? [], [data])` 包起來，
行為等價且消除告警。

### 6. react-hooks/refs（1 → 0）— 真實修正，非 disable
`src/hooks/usePollingRefresh.ts`：原本在 render 期間寫入 `refreshRef.current = refresh`。
改為 `useEffect(() => { refreshRef.current = refresh })`（無依賴陣列、每次 render 後執行），
維持「latest ref」語義；輪詢計時器只依 `intervalMs`，timing 不變。

### 7. react-hooks/purity（1 → 0）— 隨死碼移除自然消失
原 `diary/page.tsx` 內 `Date.now()` 於 render 期間呼叫（在 `DietRecord` 內），該元件屬上述死碼，
連同移除後告警消失，未額外處理。

## 新增 eslint-disable 統計
- `@next/next/no-img-element`：**5 個**（皆附理由，見上）。
- `react-hooks/set-state-in-effect`：**21 個**（皆附理由，見上）。
- 其餘規則（unused-vars、no-html-link、exhaustive-deps、refs、purity）：**0 個 disable**，全為實質修正/移除。

## 未做 / 限制
- 未 commit、未 push。
- 未更動三份系統文件。
