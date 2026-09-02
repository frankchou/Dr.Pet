# work-report｜正式庫 migration 落差檢查腳本（唯讀稽核）

**角色：** devops｜**日期：** 2026-09-02｜**指派人：** frank
**需求原文：** 「上線流程 Step 6 要對正式 Turso 執行 migration。目前我們對『正式庫到底缺什麼』只有從文件推測的說法，從來沒有實際查證過。在動正式庫之前，需要一支只讀不寫的腳本，先看清楚再執行。」

**本次未執行任何部署，也未連線正式庫。** 交付物是一支唯讀稽核工具，供 frank 在拿到正式庫憑證後自行執行。

---

## 1. 問題與設計目標

上線流程 Step 6 目前建立在「推測」之上：文件說正式庫缺 `HealthMetric`、`DailyMealPlan`、`MealPlanItem`、`NewsArticle`、`DailyHealthLog` 系列、`PushSubscription`、`ProductErrorReport`、`Feedback`、`AppReview` 等表，但沒有人實際查過。

在有真實資料的正式庫上，這種推測有三種具體的失敗模式：

| 失敗模式 | 後果 |
|---|---|
| 遠端其實是用 `db push` 建的（結構有、`_prisma_migrations` 無紀錄） | migration 直接撞 `table already exists`，套用中斷在一半 |
| 遠端有別的分支套過的 migration（分歧） | 往前套會蓋掉或衝突，且沒人知道遠端到底長什麼樣 |
| 待套用清單裡含破壞性操作（`DROP TABLE` / `INSERT` backfill） | 在有真實資料的庫上不可逆 |

因此工具的目標不是「幫忙套用」，而是**在動手之前把上述三件事查清楚**，且查證行為本身必須零風險。

## 2. 交付內容

| 檔案 | 變更 |
|---|---|
| `scripts/check-turso-migrations.mjs` | 新增（759 行，含詳盡註解） |
| `package.json` | 新增一行 script：`"db:audit-prod": "node scripts/check-turso-migrations.mjs"` |

`package.json` 只動這一行，未碰其他既有內容。

### 報告的七個區段

| 區段 | 內容 |
|---|---|
| 【1】 | 本機 `prisma/migrations/` 的完整清單（目前 15 筆） |
| 【2】 | 遠端 `_prisma_migrations` 已套用紀錄，含 `finished_at`、回滾與「未完成」狀態標記；表不存在時給出 (a) 全新空庫 /(b) `db push` 樣式 的判讀指引 |
| 【3】 | 差集：遠端缺哪幾筆、**套用順序**；遠端有本機沒有的紀錄時發出分歧警告；另檢查跳號（遠端跳過早期 migration 卻套了晚期的） |
| 【4】 | 每筆待套用 migration 會做什麼（解析 `migration.sql`）+ **套用前衝突預檢** |
| 【5】 | 遠端現有資料表清單與各表資料筆數（依筆數排序），並標示是否含真實資料 |
| 【6】 | 資料表層級落差：以本機 migration 推導「應有的表」，比對遠端實況，列出缺少的表與「遠端多出來」的表 |
| 【7】 | 結論與待人工確認事項彙總 |

### 兩個超出原始需求、但實務上關鍵的設計

**（a）套用前衝突預檢。** 解析待套用 migration 的 `CREATE TABLE` / `ADD COLUMN` 目標，逐一比對遠端 `sqlite_master` 與 `PRAGMA table_info`。若目標已存在，代表該 migration 其實已生效、只是缺紀錄——正確處理是 `prisma migrate resolve --applied`，而不是重跑。這個預檢把「套用途中才炸掉」提前到「動手前就知道」。

**（b）Prisma RedefineTables 樣式辨識。** Prisma 在 SQLite 改欄位時會展開成 `CREATE new_X` → `INSERT INTO new_X SELECT` → `DROP TABLE X` → `ALTER TABLE new_X RENAME TO X`。逐句直譯會產生誤導性的「新增資料表 new_User」「刪除資料表 User」。腳本會辨識這個樣式，合併成一行 `♻️ 重建資料表 X（過程含 DROP TABLE）`——既不誤報，也不隱藏其破壞性。本專案的 `20260227043751` 與 `20260602075632` 兩筆都屬此類。

## 3. 唯讀保證的實作方式

需求是「絕對只做讀取」。單靠「我沒寫 INSERT」的自律不夠，所以用三層結構性防護：

**第一層：SQL 全部是原始碼中的字面常數。**
送到遠端的每一句 SQL 都寫死在檔案裡，唯一的變數是資料表名稱（來自 `sqlite_master`），且一律經 `quoteIdent()` 跳脫（包雙引號、內部雙引號加倍）。

**第二層：`assertReadOnlySql()` 守門員。**
每一句 SQL 送出前都必須通過三項檢查：

- 不得含 `;`（阻斷語句堆疊）
- 開頭必須是 `SELECT`，或白名單內的查詢型 `PRAGMA`（`table_info` / `table_list` / `index_list` / `database_list`）；含 `=` 的設定型 PRAGMA（如 `PRAGMA foreign_keys=OFF`、`PRAGMA writable_schema=ON`）一律拒絕
- 全句不得出現 `INSERT`/`UPDATE`/`DELETE`/`CREATE`/`ALTER`/`DROP`/`REPLACE`/`TRUNCATE`/`ATTACH`/`DETACH`/`VACUUM`/`REINDEX`/`ANALYZE`/`BEGIN`/`COMMIT`/`ROLLBACK`/`SAVEPOINT`/`RELEASE` 等關鍵字（以 word boundary 比對，不分大小寫）

不合格直接 `throw`，SQL 根本不會離開行程。

**第三層：單一出口。**
全檔只有 `readOnlyQuery()` 一處呼叫 `client.execute()`，且該函式的第一行就是 `assertReadOnlySql()`。沒有使用 `client.batch()`、`client.executeMultiple()`、`client.transaction()`、`client.sync()`。可用一行指令驗證：

```bash
grep -n "client\.\(execute\|batch\|executeMultiple\|transaction\|sync\)" scripts/check-turso-migrations.mjs
# 只會有 readOnlyQuery() 內的那一處
```

**與 `migrate-turso.mjs` 的關鍵差異：** 本腳本**不會**建立 `_prisma_migrations` 表。`migrate-turso.mjs` 開頭有 `CREATE TABLE IF NOT EXISTS "_prisma_migrations"`——那已經是一次寫入。稽核腳本改以查詢 `sqlite_master` 判斷該表是否存在，「表不存在」本身就是重要情報，不該被順手建掉。

## 4. 安全考量（憑證不外洩）

**不印完整 `DATABASE_URL`。** Turso 連線字串可能帶 `?authToken=...`。所有輸出與錯誤訊息一律只印 `safeHost()` 的結果，比照 `src/lib/prisma.ts` 用 `new URL()` 只取 protocol + host。**不用正則裁切**——正則不匹配時 `String.replace` 會原樣回傳，等於全文洩漏。

**第三方錯誤訊息二次遮蔽。** `@libsql/client` 拋出的錯誤可能原樣夾帶連線字串。新增 `redact()`：輸出任何外部錯誤前，先用字面 `split/join` 把 `DATABASE_URL` 與 `DATABASE_AUTH_TOKEN` 的值換成 `[已遮蔽]`，再額外把任何 `authToken=...` 參數蓋掉。用字面比對而非正則，不需跳脫也沒有「不匹配就原樣回傳」的風險。

**用法示範 `read -rs` 而非指令列參數。** 指令列參數會留在 `~/.bash_history`，且同機其他行程可從 `/proc/<pid>/cmdline` 讀到。`read -rs` 讓 history 中只留下 `$TURSO_URL` 字面，展開後的值僅存在於該次行程的環境變數。

**刻意不讀 `.env`。** 這點與 `migrate-turso.mjs` 不同。devcontainer 的 `containerEnv` 會把 `DATABASE_URL` 釘成 `file:./dev.db`，而 dotenv 不覆蓋既有環境變數——若自動載入 `.env`，很容易發生「以為在查正式庫、其實查到別的庫」。稽核工具的對象必須零歧義，所以憑證每次都要明示帶入。

**`file:` 守衛（方向同 `migrate-turso.mjs`，只准遠端）。** 預設拒絕 `file:` URL。另有一個明示的自我驗證逃生門 `AUDIT_ALLOW_FILE_URL=1`：因為唯讀腳本指向本機檔案本身沒有破壞性，真正的風險是「誤以為查的是正式庫」，所以逃生門啟用時報告開頭會印出醒目警告橫幅。這個設計也讓下方的測試能跑在**與出貨版完全相同**的檔案上，不需要改動守衛本身。

## 5. 測試涵蓋的情境與結果

無正式庫憑證，因此用 `/tmp/.../scratchpad/` 下的本機 libSQL 檔案資料庫模擬「遠端」，資料表結構由專案真實的 15 筆 migration SQL 建立。**未在專案目錄留下任何測試檔案。**

### 5.1 功能情境（5 種，全數通過）

| 夾具 | 模擬狀況 | 腳本輸出 | 判定 |
|---|---|---|---|
| `fresh` | 全新空庫：無 `_prisma_migrations`、無任何表 | 待套用 15 筆／缺 30 表／衝突 0；正確給出「(a) 全新空庫」判讀，並提醒須對照【5】確認 | ✅ |
| `synced` | 15 筆全部套用完成 + 有資料 | 待套用 0／缺表 0／分歧 0；結論「完全同步，Step 6 無事可做」 | ✅ |
| `gap` | 只套到第 6 筆 + 有真實資料 | 待套用 9 筆並列出正確順序；缺 12 表；正確辨識出 `HealthMetric`、`DailyMealPlan`、`MealPlanItem`、`NewsArticle`、`DailyHealthLog`/`MedicationRecord`/`GroomingRecord`/`MeasurementRecord`、`PushSubscription`、`ProductErrorReport`、`Feedback`、`AppReview` | ✅ |
| `divergent` | 套到第 6 筆 + 2 筆本機不存在的紀錄（其中 1 筆 `finished_at` 為 null） | 🚨 分歧警告列出 2 筆；「未完成」狀態獨立標記；兩者都進【7】待確認清單 | ✅ |
| `nopush` | 結構已建但無 `_prisma_migrations`（`db push` 樣式） | 🚨 衝突預檢抓出 19 項「目標已存在」，並建議用 `migrate resolve --applied` 而非重跑 | ✅ |

`gap` 情境的輸出恰好對上文件的推測清單——這代表工具能拿來**證實或推翻**那份推測，而不是重複它。

### 5.2 唯讀驗證（實測，非宣稱）

對 4 個含資料的夾具，比對稽核前後的資料庫檔案 SHA-256：

```
✅ synced.db     未被修改 (657885c92e50e633)
✅ gap.db        未被修改 (e727c6106f2ea2ac)
✅ divergent.db  未被修改 (b8a21ef6f7944c10)
✅ nopush.db     未被修改 (f6f6a649dc7bb2f0)
✅ 執行後未產生任何 -wal / -shm / -journal 檔案
```

### 5.3 守門員單元測試（23 項，全數通過）

測試直接從**已出貨的原始碼**抽出 `assertReadOnlySql()` 與 `quoteIdent()` 來驗證，不是另寫一份複本：

- 10 種直接寫入語句（`DROP`/`DELETE`/`INSERT`/`UPDATE`/`CREATE`/`ALTER`/`VACUUM`/`BEGIN`/`ATTACH`/`REPLACE`）→ 全部拒絕
- 8 種偽裝／夾帶：分號堆疊、小寫繞過、設定型 PRAGMA（`foreign_keys=OFF`、`writable_schema=ON`）、非白名單 PRAGMA、CTE 開頭的 `DELETE`、前置空白 → 全部拒絕
- 4 種合法唯讀查詢 → 全部放行
- 識別字注入：表名 `Pet"; DROP TABLE "User` 經 `quoteIdent()` 跳脫後仍被護欄的分號檢查攔下（雙重防護）

### 5.4 憑證外洩測試

以 `DATABASE_URL="...?authToken=SUPER_SECRET_TOKEN_XYZ"` 觸發兩種真實錯誤：

| 情境 | 輸出 | token 是否出現 |
|---|---|---|
| 畸形 URL scheme（libsql 函式庫拋錯，訊息含原始 URL） | `檢查失敗（目標 libsql-bad://prod.turso.io）：URL_SCHEME_NOT_SUPPORTED...` | ❌ 未出現 |
| 不存在的主機（連線失敗） | `檢查失敗（目標 libsql://nonexistent-db-xyz.turso.io）：...` | ❌ 未出現 |
| 缺 `DATABASE_AUTH_TOKEN` | `缺少 DATABASE_AUTH_TOKEN（目標 libsql://prod-db.turso.io）` | ❌ 未出現 |

### 5.5 其他

- `npx eslint scripts/check-turso-migrations.mjs` → 無錯誤
- `node --check` → 語法正確
- `npm run db:audit-prod` 與 `node scripts/...` 兩種呼叫方式行為一致，守衛在兩者下都有效
- **依指示未執行 `npm run build`**（有其他 agent 並行作業，並行 build 會互相破壞 `.next/`）

## 6. 給 frank 的執行說明

### 6.1 取得憑證

```bash
turso db list                      # 確認正式庫名稱
turso db show <正式庫名稱>          # 取得 libsql:// URL
turso db tokens create <正式庫名稱> # 建立 token（建議建唯讀 token，見下）
```

**建議用唯讀 token**，讓「唯讀」這件事在資料庫端也成立，而不只靠腳本自律：

```bash
turso db tokens create <正式庫名稱> --read-only --expiration 1h
```

### 6.2 執行稽核（完整指令）

複製整段貼上即可。`read -rs` 的 `-s` 不回顯、`-r` 不吃反斜線；history 中只會留下 `$TURSO_URL` 字面，不會留下憑證本身。

```bash
cd /workspaces/Dr.Pet

read -rs -p "Turso DATABASE_URL: " TURSO_URL; echo
read -rs -p "Turso AUTH TOKEN: "   TURSO_TOKEN; echo

DATABASE_URL="$TURSO_URL" DATABASE_AUTH_TOKEN="$TURSO_TOKEN" \
  node scripts/check-turso-migrations.mjs | tee /tmp/turso-audit.txt

unset TURSO_URL TURSO_TOKEN
```

報告會同時顯示在終端機並存到 `/tmp/turso-audit.txt`，可直接貼進工作報告。輸出不含任何憑證。

`npm run db:audit-prod` 是等效捷徑：

```bash
DATABASE_URL="$TURSO_URL" DATABASE_AUTH_TOKEN="$TURSO_TOKEN" npm run db:audit-prod
```

**離開碼：** 0 = 報告產出成功（有無落差都是 0）；1 = 執行失敗（守衛擋下 / 連線錯誤）。有落差不算錯誤，請看【7】結論區段。

### 6.3 讀報告的三個重點

1. **【7】有沒有列出「待人工確認」項目？** 有的話先處理完再動正式庫。
2. **【4】的衝突預檢是否通過？** 若列出「目標已存在」，代表 migration 其實已生效、只是缺紀錄——用 `prisma migrate resolve --applied <name>` 補紀錄，**不要重跑**。
3. **【5】正式庫有多少真實資料？** 決定備份的必要性與套用時機。

## 7. Step 6 建議執行順序

```
1. 稽核（唯讀，零風險）
   → node scripts/check-turso-migrations.mjs
   → 把報告貼進工作報告留存，這是「動手前的正式庫實況」證據

2. 判讀報告
   ├─ 待套用 0 筆、無警告 → Step 6 無事可做，直接跳到 6
   ├─ 有分歧 migration     → 停。先釐清那幾筆從哪來，不要往前套
   ├─ 有衝突預檢項目       → 停。先 prisma migrate resolve --applied 補紀錄，
   │                          補完「重跑稽核」確認衝突歸零，再繼續
   └─ 乾淨的落差           → 繼續

3. 備份（若【5】顯示有真實資料，此步不可略過）
   → Turso 主控台建立 snapshot，或 turso db shell <db> ".dump" > backup.sql
   → 記下備份時間點

4. 套用 migration
   → DATABASE_URL="$TURSO_URL" DATABASE_AUTH_TOKEN="$TURSO_TOKEN" \
       node scripts/migrate-turso.mjs
   → 注意：token 需具寫入權限（稽核用的唯讀 token 在此不適用）
   → 特別留意 20260604000000_backfill_owner_membership：
     這筆是資料 backfill（INSERT INTO PetMember），不是純結構變更。
     該 migration 的註解已註明部署順序要求：正式 Turso 須「先跑此 backfill
     → 再上權限檢查程式碼」，否則既有 owner 會短暫被 403。

5. 再次稽核（驗證）
   → 重跑 node scripts/check-turso-migrations.mjs
   → 應顯示「✅ 遠端與本機完全同步」、缺表 0、衝突 0
   → 這份輸出就是 Step 6 的完成證據

6. 部署後驗證
   → 正式站實測核心流程（登入 → 寵物資料 → 日誌 → AI 分析）
   → 檢查 Vercel log 無 Prisma 相關錯誤

7. 記錄
   → 部署時間、版本（commit hash）、指令、前後兩份稽核報告
```

**環境變數提醒：** 本次未新增任何環境變數。若後續在 Vercel 調整 `DATABASE_URL` / `DATABASE_AUTH_TOKEN`，**必須重新部署才會生效**——Vercel 的環境變數是在 build/啟動時注入，改完不重新部署等於沒改。

## 8. 已知限制

- **`checksum` 欄位不比對。** `migrate-turso.mjs` 寫入紀錄時 checksum 固定為空字串，因此無法偵測「migration 名稱相同但 SQL 內容被改過」。差集判定純以 migration 名稱為準。若日後改用 `prisma migrate deploy` 管理正式庫，可再加上 checksum 比對。
- **欄位層級落差只在待套用 migration 的 `ADD COLUMN` 目標上檢查**，不做全表 schema 逐欄比對。表層級落差（【6】）則是完整的。
- **`_prisma_migrations` 表不存在時無法列出已套用紀錄**，此時判斷完全依賴【5】的資料表清單，需要人工判讀。報告已明確說明這一點。
- SQL 解析為靜態文字分析，涵蓋 Prisma 產出的所有樣式；若日後手寫非典型 SQL（如 `CREATE TABLE AS SELECT`），會落到「其他」而不呈現細節，但不影響差集與衝突預檢的正確性。

## 9. 未執行事項（如實回報）

- **未連線正式 Turso**——尚未取得憑證，所有驗證都在本機模擬夾具上完成。文件中「正式庫缺哪些表」的說法**目前仍未經查證**，需由 frank 執行本腳本後才能定案。
- **未執行部署**，本次不涉及任何對外不可逆動作。
- **未執行 `npm run build`**（依指示避開並行衝突）。
- **未 commit**（依指示）。
- **未更動三份系統文件**（`docs/系統架構.md`、`docs/系統機制.md`、`docs/版本紀錄.md`）與 `docs/待辦清單.md`——依指示由總指揮統一整合。建議整合時補上：系統架構補一行 `scripts/check-turso-migrations.mjs` 的職責；系統機制補上 Step 6 的稽核流程；版本紀錄補一筆新增稽核腳本的條目。
