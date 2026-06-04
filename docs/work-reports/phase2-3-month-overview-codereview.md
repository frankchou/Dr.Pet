# Code Review — 日誌月曆總覽修正（Phase 2-3）

審查人：Code Reviewer
審查範圍（未 commit 改動）：
- `src/components/diary/MonthHealthOverview.tsx`
- `src/app/diary/page.tsx`
- `prisma/seed.ts`

對照文件：`CLAUDE.md`（資料模型、parseJson 慣例）、`coding-conventions` skill。
型別檢查：`npx tsc --noEmit` 對以上檔案無錯誤。

---

## 結論

**無阻擋上線的必修問題（🔴 = 0）。** 本次核心修正方向正確：

1. `recordedCount` 從 `recordedDates`（來源是 `/api/usages`，即 ProductUsage 打點）改成
   `new Set(monthLogs.map(l => l.date)).size`（來源是 DailyHealthLog），與 `abnormalDays` 同源，
   `healthyDays = recordedCount − abnormalDays` 確定不會為負。這是真正的 bug 修復。
2. normalValues 白名單 + `abnormalMultiValues()` helper 讓「異常」判斷集中且語意一致，
   情緒「平靜放鬆」不再被誤算成異常觀察。
3. seed mood `活潑好動` → `平靜放鬆`，把無效假資料改成合法值。

可進文件同步與 commit。下列 🟡 建議為品質與資料一致性改善，非阻擋項。

---

## 🔴 必修
（無）

---

## 🟡 建議

### B1. mood 白名單含不存在的選項 `活潑好動`，且註解描述不正確
**檔案**：`MonthHealthOverview.tsx` L57-59（註解）、L65（白名單）

MoodCard 的唯一選項為 `平靜放鬆／焦躁不安／攻擊低吼／異常嚎叫`（見 `MoodCard.tsx` L66-69），
其中只有 `平靜放鬆` 是正常值。白名單卻寫成
`new Set(['平靜放鬆', '活潑好動'])`，`活潑好動` 不是任何 MoodCard 選項（那是 VitalityCard 的
`活動意願高` 概念，也正是這次從 seed 移除的舊無效值）。

影響：功能無誤——`活潑好動` 永遠不會出現在真實 mood 資料裡，是一條永不命中的死條目。
但它（與 L58 註解「情緒行為含正常值（平靜放鬆／活潑好動）」）會誤導後人以為 `活潑好動`
是合法正常情緒。

建議修法：白名單收斂為 `new Set(['平靜放鬆'])`，並把註解改為「情緒行為僅 `平靜放鬆` 為正常值，
其餘選項皆為異常徵兆」。

### B2. 7 張觀察卡片 seed 存 label、實際卡片存 key —— 不影響本次統計，但 seed 應修正
**檔案**：`prisma/seed.ts` L141、L154、L156

既有落差確認屬實：`EyeEarCard / SkinHairCard / DentalCard / DigestionCard / RespiratoryCard /
NeuroCard / ReproductiveCard` 實際存的是 option **key**（如 `'tears'`、`'scratch'`，見
`EyeEarCard.tsx` L35-37、L73），但 seed 存的是 **label**（如 `JSON.stringify(['流淚淚痕'])`、
`['頻繁抓搔','掉毛嚴重']`、`['嘔吐']`）。

**對本次統計是否有影響：無。** 這 7 張卡片在 `MULTI_FIELDS` 的 `normalValues` 皆為空集合，
`abnormalMultiValues()` 對「任何值」都判定為異常，與該值是 key 還是 label 無關。
因此 `abnormalDays / healthyDays / sectionHits / symptomDist` 在這 7 個欄位的計數正確。
（注意：`mood` 不在此列——MoodCard 存的是 value 即中文字串，白名單比對的也是中文字串，
兩者一致，mood 的正常值判斷正確。）

**但仍建議修正 seed**：seed 與真實資料格式不一致，未來任何「用 key 對照 label 顯示」
或「以 key 做集合運算」的功能都會踩到。`digestion: JSON.stringify(['嘔吐'])`（L156）甚至連
DigestionCard 的 label 都不是（DigestionCard 是 `吐黃水／吐白沫…`，沒有「嘔吐」），純屬不存在的值。
列為建議，由全端在後續一併校正 seed 假資料格式。

### B3. 排便分佈的紅色判斷對不到實際選項（既有、非本次引入）
**檔案**：`MonthHealthOverview.tsx` L350

`val === '帶血便' || val === '嚴重腹瀉'` 才上紅色，但 StoolCard 實際選項是
`帶血(急)`、`泥水腹瀉`（`StoolCard.tsx` L133/137），字串對不上，紅色永遠不會觸發，
帶血便會以琥珀色（warning）顯示而非紅色（danger）。屬顯示層級、既有問題，本次未動到此行，
列為順手可修建議。

---

## 🟢 OK（已確認正確）

- **recordedCount 跨日期格式 / 時區**：DailyHealthLog.date 為純字串 `YYYY-MM-DD`
  （`daily-health-log/route.ts` 以字串範圍查詢，無 Date 解析），`new Set(...).size` 無時區風險；
  且 `petId_date` 為 unique，本就不會重複，Set 僅為防禦性去重。✔
- **healthyDays 非負**：`recordedCount` 與 `abnormalDays` 皆衍生自同一份 `monthLogs`，
  `abnormalDays ≤ recordedCount` 恆成立。✔
- **白話摘要 vs 統計數字一致**：摘要用的 `recordedCount / healthyDays / abnormalDays`
  與下方三格統計（L278/282/286）是同一批變數,數字必然一致；`abnormalDays === 0` 時摘要
  正確隱去「N 天有異常觀察」片段。✔
- **單選欄位正常值白名單**：`VITALITY_NORMAL / APPETITE_NORMAL / WATER_NORMAL /
  STOOL_NORMAL / URINE_NORMAL` 與各卡片選項核對無漏：
  STOOL 正常值 `正常成形／羊便便(硬)` 對應 StoolCard 兩個良性選項;其餘 stool/urine/vitality/
  appetite/water 異常選項皆會被正確計為異常。✔
- **移除 `recordedDates` prop**：`MonthHealthOverview` 的 Props 介面與解構同步移除，
  全專案僅此一處使用該元件（grep 確認）；`diary/page.tsx` 的 `recordedDates` state 仍由
  `MonthCalendar`／`WeekCalendar` 使用（L1310/1324），未變孤兒，無殘留壞引用。✔
- **abnormalMultiValues / hasAbnormality**：沿用 `parseJson` 慣例、提早 return、單一職責，
  符合 coding-conventions。✔
- **seed mood 修正**：`活潑好動` 並非 MoodCard 合法選項，改為 `平靜放鬆`（合法且為正常值）
  方向正確。✔
- **型別**：空 `new Set()` 透過 `normalValues: Set<string>` 的脈絡型別推導為 `Set<string>`，
  `tsc --noEmit` 無錯。✔
