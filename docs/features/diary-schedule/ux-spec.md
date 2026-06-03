# UX Spec：重要日程 / 未來日程表

**版本：** v1.0  
**設計師：** UX Agent  
**狀態：** 待 PM 審核

---

## 一、資料模型

新增 `Schedule` 資料表：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | String (cuid) | PK |
| `petId` | String | FK → Pet (cascade delete) |
| `title` | String (max 50) | 必填 |
| `date` | String (YYYY-MM-DD) | 必填 |
| `time` | String? (HH:mm) | 選填 |
| `category` | Enum | vaccine / deworming / checkup / grooming / medication / other |
| `repeat` | Enum | none / weekly / monthly / yearly |
| `notes` | String? (max 200) | 選填 |
| `isDone` | Boolean | 預設 false |
| `createdAt` | DateTime | 自動 |

---

## 二、首頁兩區塊定義

### 重要日程（3 格固定）

| 格子 | 內容 | 資料來源 |
|------|------|------|
| 疫苗 | 最近未完成的 category=vaccine 一筆；無則顯示 `--` | Schedule |
| 驅蟲 | 最近未完成的 category=deworming 一筆；無則顯示 `--` | Schedule |
| 生日 | 寵物生日計算下次生日 | Pet.birthday |

點擊疫苗/驅蟲格 → 帶預設 category 跳轉新增表單。

### 未來日程表（動態清單）

- 取未來 90 天內 `isDone=false` 的日程，按日期升序
- Tab 篩選（前端）：全部 / 醫療 / 美容 / 其他
  - 醫療：vaccine + deworming + checkup + medication
  - 美容：grooming
  - 其他：other
- 空狀態：顯示「還沒有日程，點 + 新增」

---

## 三、入口

- 首頁「未來日程表」標題列右側 `+` 圓形按鈕 → `/diary/schedule/new`
- 疫苗/驅蟲格（無資料狀態）點擊 → `/diary/schedule/new?category=vaccine`

---

## 四、新增 / 編輯表單

**路由：**
- 新增：`/diary/schedule/new`（可帶 `?category=` 預填）
- 編輯：`/diary/schedule/[id]/edit`

**版面：** Full-page（非 bottom sheet）

**頂部 bar：**
- 左：「取消」← 返回
- 中：「新增日程」/ 「編輯日程」
- 右：「儲存」（必填未填則 disabled）

**表單區塊（4個卡片）：**

1. **基本資訊**
   - 標題（文字輸入，必填）
   - 類別（Picker：疫苗 / 驅蟲 / 回診 / 美容 / 用藥 / 其他）

2. **時間**
   - 日期（DatePicker，必填）
   - 時間（TimePicker，選填）

3. **設定**
   - 重複（選單：不重複 / 每週 / 每月 / 每年）
   - 關聯寵物（若有多隻則顯示）

4. **備註**
   - 備註（多行文字，選填，max 200字）

---

## 五、互動行為

| 場景 | 行為 |
|------|------|
| 完成日程 | tap checkbox → `PATCH isDone=true`；若 repeat≠none，後端自動 insert 下一筆 |
| 編輯 | 向左滑（mobile）顯示「編輯」「刪除」；desktop hover 顯示 `...` |
| 刪除 | 確認 dialog 後刪除；重複日程詢問「只刪此筆 / 全部刪除」|

---

## 六、API 端點

| Method | 路徑 | 說明 |
|--------|------|------|
| GET | `/api/schedules?petId=&category=&dateFrom=&dateTo=&isDone=&limit=` | 查詢 |
| POST | `/api/schedules` | 新增 |
| PATCH | `/api/schedules/[id]` | 更新（含標記完成）|
| DELETE | `/api/schedules/[id]` | 刪除 |

---

## 七、待確認（請 PM 決定）

1. 重複日程完成後，後端自動建立下一筆的規則（同時間往後推一個週期）？
2. 「節日」這個 tab 是否永久移除，還是保留供未來擴充？
3. 首頁重要日程「生日」格是否要做點擊行為（例如跳到紀念日頁）？
