# Phase 0 收尾 + 手機選單 — Code Review

審查範圍：本工作階段尚未 commit 的改動（AppShell 手機選單/鈴鐺、seed 防呆、ProductReaction→/diary、AIInsight 顯示端、/symptoms 改 client）。
審查者：Code Reviewer。`npx tsc -b` 已通過（exit 0）。

---

## 🔴 必修

無「阻擋上線」等級的必修問題。

權限那條（GET /api/analyze 不驗擁有者）原本會列必修，但複查後判定為**全站既有慣例**，降為 🟡（見下）。

---

## 🟡 建議

### 1. GET /api/analyze 無擁有者驗證，可讀任意寵物的 AIInsight
`src/app/api/analyze/route.ts:7-23`

新增的 GET 只用 query 的 `petId` 過濾，沒有比對 `session.user.id` / `PetMember`，任何人帶別人的 `petId` 就能讀到該寵物的關聯分析（含 rationale、建議行動）。

但這**不是這次新增碼引入的問題**：同檔的 POST（`:34` `findUnique({ where:{ id: petId }})`）、`/api/symptoms` GET（`:11`）、`/api/reactions` GET（`:5-18`）全都是「只認 petId、不驗擁有者」。新 GET 只是沿用既有慣例，未讓情況惡化。

- 建議：列入 security-baseline 待辦，統一替「以 petId 查詢」的 GET 端點加上擁有者過濾（例如以 session userId join PetMember）。本次可不阻擋，但應在報告中明列為已知債務，避免被當成本次「新引入」的漏洞。

### 2. AppShell 手機選單缺少 Escape 關閉與 `aria-expanded`
`src/components/layout/AppShell.tsx:131-135`

頭像按鈕已補 `aria-label="開啟選單"`（優於桌面 Sidebar 用 `div+onClick`），但：
- 沒有 `aria-expanded={showMenu}` / `aria-haspopup`，輔助技術讀不到展開狀態。
- 只綁了 `mousedown` 外點關閉，沒有 `Escape` 關閉，鍵盤使用者開了選單關不掉。

桌面 Sidebar 同樣缺這兩點，所以這是「與桌面一致」但兩邊都偏弱。建議至少在新碼補 `aria-expanded`；Escape 可一併處理或列待辦。

### 3. 手機與桌面 ProfileMenu 為複製貼上，選單內容已重複
`src/components/layout/AppShell.tsx:139-181`、`src/components/layout/Sidebar.tsx:185-224`

兩處的「切換毛孩 / 設定 / 登出」選單 JSX 幾乎逐字相同（含同一段 settings/logout SVG path、switchPet 邏輯、pets/currentPetId/showMenu/menuRef 的 hook 組）。目前可維護性尚可，但已達「抽成 `<ProfileMenu>` 共用元件」的門檻——任一邊改文案或行為，另一邊很容易漏改。

- 建議：抽出共用 `ProfileMenu`（含 pets 載入、switchPet、外點關閉），桌面與手機只負責觸發樣式。非本次必做，列重構待辦即可。

### 4. AppShell 鈴鐺非 md:hidden，桌面也會顯示且導向 /news，與 Sidebar 的「快訊」重複
`src/components/layout/AppShell.tsx:191-196`

header 的鈴鐺沒有 `md:hidden`，桌面寬度下會與左側 Sidebar 既有的「快訊」導覽項同時存在、都指向 `/news`。功能不算 bug，但桌面出現兩個入口稍顯冗餘。請確認這是預期（手機才需要鈴鐺，桌面靠側欄）；若是，建議鈴鐺加 `md:hidden`。

### 5. 樂觀更新的暫存 reaction 物件缺 `notes` 欄位
`src/components/diary/DailyReactionCard.tsx:95`

`return [...prev, { id: 'tmp', productId, rating }]` 建立的物件少了 `notes`，雖然 `ProductReaction.notes` 為 optional 而 tsc 過，且隨後 `loadReactions()` 會覆蓋掉暫存值，目前無實害。屬型別完整性的小瑕疵，可忽略或補 `notes: null`。

### 6. seed ChatMessage 時段 `10 + i` 為魔術數，多訊息時可超出 24 小時制
`prisma/seed.ts`（ChatMessage 區塊，`createdAt: ...T${10 + i}:00...`）

目前只有 4 筆（10:00~13:00）安全。註解雖說明「用分鐘錯開」實際是用「小時」錯開；若未來把 chatMessages 加到 14 筆以上，`10 + i` 會產生 `24:00` 之類非法時間字串，`new Date(...)` 會回 Invalid Date。屬未來陷阱，建議改用分鐘位（如 `T10:${String(i).padStart(2,'0')}`）或對小時取模。非本次必修。

---

## 🟢 OK（已確認正確）

- **seed 防呆**（`prisma/seed.ts:19-26`）：在建立 adapter 之前就檢查 `DATABASE_URL` 非 `file:` 即 `process.exit(1)`，方向正確、訊息清楚，能擋住誤對 Turso 正式庫跑 seed。
- **ProductReaction upsert**（`prisma/seed.ts` reactions 區塊、`DailyReactionCard` rate→POST）：seed 用 `petId_productId_date` 複合鍵 upsert，與 `/api/reactions` POST、schema `@@unique([petId,productId,date])` 完全對齊；`date` 一律走 `dateStr()` 產生的 `YYYY-MM-DD`，與 API 字串比對一致。
- **DailyReactionCard 競態處理**（`:62-86`）：用 `active` flag 在 cleanup 設 false，避免 petId/date 切換時舊請求覆寫新狀態；Promise.all 雙抓、樂觀更新後 `loadReactions()` 回讀對齊，邏輯正確。
- **DailyReactionCard 對齊 currentPetId**：透過 `petId` prop 由 `/diary` 注入（`diary/page.tsx:1335` `{petId && <DailyReactionCard .../>}`），未自行從 localStorage 抓，來源單一、不會與頁面 currentPetId 不一致。
- **CorrelationInsights**（`src/components/nutrition/CorrelationInsights.tsx`）：`loaded` flag 區分「載入中 / 已載入但無資料 / 有資料」，空狀態完整；`triggerName()` 同時容納字串陣列（seed）與 `{name}` 物件陣列（AI 產出），`parseJson` 走既有工具、有 fallback；`petId` 變更時重設 loading/loaded，無殘留。
- **GET /api/analyze 形狀**：`findFirst` 取最新一筆、查無回 `null`，前端 `r.ok ? r.json() : null` 對得上；try/catch 有錯誤處理、不吞錯（`console.error`）。
- **/symptoms 改 client**（`src/app/symptoms/page.tsx`）：改以 `drpet_currentPetId` 為準（取代原「最舊寵物 findFirst」），與全站一致；監聽 `storage` 事件同步切換；`summarizeByType` 用單次 `limit=200` 查詢在前端切類，取代原本「每類型兩次 DB 查詢」的 N+1，效率與正確性都改善；loading/空狀態分支完整。
- **AppShell switchPet 跨元件同步**（`:79-84`）：`localStorage.setItem` 後手動 `dispatchEvent(StorageEvent)`，與 Sidebar 寫法一致，能讓同分頁其他監聽者即時更新（原生 storage 事件不會在同分頁觸發，這個手動派發是正確且必要的）。
- **a11y 基本**：頭像按鈕由 `div` 改 `button` 並加 `aria-label`、鈴鐺加 `aria-label`，較原本進步。
- **pointer-events**：header 容器 `pointer-events-none`，互動元素（頭像 wrapper、彈出選單、鈴鐺）各自 `pointer-events-auto`，未破壞既有點擊穿透設計。

---

## 結論

- **無必修、無阻擋上線的嚴重問題。** tsc 通過。
- 🟡 6 點均為建議（權限債務、a11y 補強、重複碼抽元件、桌面鈴鐺冗餘、seed 未來陷阱），其中**第 1 點（GET 權限）與第 3 點（重複碼）建議列入 backlog**，因屬全站既有慣例、非本次新引入，可不擋本次提交。
- **可進入文件同步與 commit。** 建議 commit 訊息或 PR 描述中註明「GET /api/analyze 沿用既有 petId-only 查詢慣例，擁有者驗證列為全站待辦」，以免日後誤判為本次新增漏洞。
