# PurePaw 無敏毛孩 — Design System

> 寵物營養健康管理平台。本設計系統以 **第二版 Figma UIUX** 為視覺唯一依據,並把 **第一版功能 (GitHub Dr.Pet)** 完整整併進這套視覺語言。

---

## 1. 產品脈絡 (Product context)

**PurePaw 無敏毛孩** 是一套給台灣飼主的 **寵物營養 / 健康管理 App**(同時有手機與桌面版面)。核心價值:
> 透過直覺的介面,提供毛孩的營養成分分析與建議,協助飼主把日常飲食、用藥、美容、健康狀況記錄下來,並用 AI 給出觀察建議。

產品經歷兩個版本,本專案的任務是把兩版「合一」:

| | 第一版 (v1) | 第二版 (v2) |
|---|---|---|
| 代號 | 寵物隨行醫師 **Dr. Pet** | **PurePaw 無敏毛孩** |
| 來源 | GitHub `frankchou/Dr.Pet`(Next.js 程式碼) | Figma Make 匯出檔 `.make`(React 程式碼) |
| 角色 | **功能** 的依據 | **視覺 / UIUX** 的依據 |
| 視覺 | 赤陶 `#C4714A` + 米色 `#FAF7F2`、專業沉穩、手機 480px | 馬卡龍杏色 `#FFE8D6` + 黑、Quicksand、可愛韓系手繪、RWD |

**整併原則(依使用者要求):**
1. **第二版 UIUX 完全保留** — 視覺風格、既有畫面 (登入 / 首頁 / 日誌 / 設定) 一比一還原,不更動。
2. **第一版功能完全保留** — 每個 v1 功能都在 v2 找到家;Figma 只放「即將上線」佔位的畫面 (AI 營養師、即時分析),用 **v2 的視覺風格** 把 v1 的真實功能補上。
3. 真的對應不上的,在 **第 6 節 功能對應表** 明確列出。

### 資料來源 (Sources — 讀者若有權限可深入研究)
- **第一版程式碼**:GitHub `https://github.com/frankchou/Dr.Pet`(Next.js App Router;`src/app/*` 各頁面 + `src/app/api/*` API + `src/components/*`)。建議從這裡更深入地了解產品功能與資料模型。
- **第二版 UIUX**:Figma 發佈站 `https://foil-shred-10229341.figma.site`(無法內嵌截圖);實際視覺取自使用者提供的 `無敏毛孩 PurePaw.make` 匯出檔,還原後的原始碼存於本專案 `_make/v2/`(僅供參考)。

---

## 2. 代表產品 (Surfaces)

單一產品、單一程式碼庫,但為 **響應式 (RWD)**,有兩種版面:
- **手機 App shell** — 底部導覽列 + 中央凸起黑色相機 FAB。
- **桌面 Web** — 左側固定側邊欄 + 白色圓角主面板。

→ UI Kit: [`ui_kits/purepaw_app/`](ui_kits/purepaw_app/)(同一套程式碼同時涵蓋手機與桌面)。

---

## 3. 內容基調 (Content fundamentals)

- **語言**:繁體中文 (台灣用語),品牌名雙語並置 **PurePaw / 無敏毛孩**。
- **稱呼**:寵物一律稱「**毛孩**」;飼主稱「飼主」。對使用者用「您」。
- **語氣**:親切、溫暖、鼓勵,但專業可信。例句:
  - 「讓我們來看看 布丁 今天的營養狀況吧」
  - 「今天也為毛孩記錄健康吧！」
  - 「專屬台灣毛孩的 AI 健康管理神器」
- **大小寫 / 標點**:中文用全形標點;品牌與英文 (PurePaw、AI、Google) 保留原樣。標籤常用方括號分區,如 `[用藥與看診]`、`[洗澡美容]`(v2 原文)。
- **Emoji**:**幾乎不用**。情感與裝飾交給手繪 SVG(腮紅、星星)與 lucide 線性圖示。v1 曾用 🐾🤖 等 emoji,整併到 v2 時 **改用品牌 Logo / 圖示取代**。
- **數字與單位**:倒數用「剩 N 天」;體重「N 公斤 / kg」;百分比直接 `85%`、`72%`。
- **免責聲明 (重要)**:AI 營養相關功能必附:「本功能提供資訊整理與觀察建議,不能替代獸醫診斷。」
- **Vibe**:像一本可愛但可靠的毛孩健康手帳。少即是多,留白大方,重點用黑色實心強調。

---

## 4. 視覺基礎 (Visual foundations)

完整 token 見 [`colors_and_type.css`](colors_and_type.css)。

- **字體**:**Quicksand**(圓潤無襯線)為唯一字體家族。階層靠 **字重 + 字級**,不靠多字體。
  - 注意:v2 大量使用 `font-black`,但 **Quicksand 最重只到 700**,故 black 實際渲染為 700。中文則 fallback 到 Noto Sans TC。
- **顏色**:
  - 畫布 `#F4F7FB`(冷調藍灰)、卡片 `#FFFFFF`、文字 `#111111` 與 slate 灰階。
  - **品牌主色 = 馬卡龍杏 `#FFE8D6`**,深色強調 `#D98A53`(赤陶/焦糖)。
  - 語意點綴(克制使用):粉嫩 `#FCA5A5`/`#F391B3`、黃 `#FDE047`、藍 `#7C9CE3`、綠系 `#2D6A4F`/`#E2F3E4`(健康/換食)、危險紅 `#DC2626`/`#FEF2F2`。
- **圓角**:非常圓。pill (9999px) 用於分頁/標籤/按鈕;卡片 `24–32px`;桌面主面板 `40px`;圖示容器 `20px`。
- **背景**:無漸層濫用。首頁用 **全幅毛孩照片** + 由下往上淡入畫布色的保護漸層;卡片偶見極淡杏色模糊圓斑裝飾。**不用** 重複紋理 / 藍紫漸層。
- **陰影**:一律柔和低對比。`shadow-sm` 為主;黑色 CTA / FAB 用 `shadow-lg shadow-black/10`;彈出選單用 slate 柔光;底部導覽列用上方負向柔光 `0 -10px 40px rgba(0,0,0,.04)`。
- **邊框**:招牌是 **2px、slate-900/5(5% 黑)** 的極淡描邊卡片;一般分隔線 slate-100/200。
- **透明 / 模糊**:照片上的膠囊標籤與頂部按鈕用 `bg-white/30–80 + backdrop-blur`(玻璃感);底部導覽列 `bg-white/95 backdrop-blur`。
- **動畫**:入場 `fade + slide`(約 0.45s、ease-out);hover 放大 `scale-105` / 加深陰影;切換用顏色過渡。**不用** 彈跳誇張動畫(打字指示器除外)。
- **狀態**:
  - **Active / 選中** = 實心黑 `#111111` 底 + 白字(分頁、導覽、日曆今日、勾選圈)。
  - **Hover** = 變深 / 淡灰底 / 陰影加重。
  - **Press** = `active:opacity` 或 `scale`。
- **版面規則**:手機底部導覽固定;桌面側邊欄固定 `w-64`;主內容 `max-w-6xl` 置中;頂部 header sticky 且向下捲動時淡出。

---

## 5. 圖示 (Iconography)

- **主要圖示系統 = [lucide](https://lucide.dev)**(`lucide-react`,線性、`strokeWidth` 2–2.5、圓角端點)。v2 原生使用,本 Kit 以 lucide UMD 還原,圖示一比一。
  - 常用:`Home, Book, Camera, Stethoscope, Newspaper, Bell, Plus, ArrowUpRight, Sparkles, Calendar, Droplets, Cake, Activity, Search, Mic, Pill, Scissors, Check, AlertTriangle, Package, Info, PawPrint, Weight, Hash, Menu, Send, ChevronLeft/Right/Up/Down, LogOut`。
  - 新版 lucide 改名的圖示(`CheckCircle2 → CircleCheck`、`BarChart3 → ChartColumn`、`XCircle → CircleX`…)在 `icons.jsx` 內建別名 fallback。
- **自繪線性圖示**:首頁健康卡用一組 duotone 線性圖(`bone / medbox / pill / syringe / parasite`),保留在 `icons.jsx` 的 `LineFillIcon`。
- **品牌 Logo**:見 [`assets/logo.svg`](assets/logo.svg) — 馬卡龍杏圓角方 + 手繪黑色毛孩臉 + 粉腮紅 + 黃色手繪星星。**請勿** 用 emoji 或他牌圖示替代。
- **Emoji / Unicode**:基本不用(見第 3 節)。
- **品牌插畫**:登入頁的手繪毛孩 + 飯碗 + 火花,為 inline SVG(保留在 `Settings.jsx` 的 `HandDrawnGraphic`)。

> 替代說明:本 Kit 透過 CDN 載入 lucide(與 v2 同款),非替代品。字體 Quicksand 由 Google Fonts 載入,與 v2 一致。

---

## 6. 功能對應表 — v1 → v2(整併報告)

> ✅ 完整對應　⚠️ 部分對應 / 形式改變　❌ 第二版無對應位置

| 第一版功能 (Dr.Pet) | v1 位置 | 第二版對應 (PurePaw) | 狀態 |
|---|---|---|---|
| 毛孩檔案(頭像/品種/性別/體重/年齡) | 首頁 + `/pet` | **首頁** 全幅 hero + **設定 › 毛孩檔案** 表單 | ✅ |
| 多寵物切換 | 首頁輪播 | 側欄/頂部「切換毛孩」+ 設定左右滑動卡 | ✅ |
| 健康記錄 / 日誌 | `/log` | **日誌**(換食計畫橫幅、月/週曆、AI 隨記、用藥看診、洗澡美容、飲食紀錄) | ✅ v2 更完整 |
| 症狀記錄 | `/symptoms` | 日誌 AI 隨記自動標記 + 設定 › 異常症狀參數 + 首頁「日常症狀」 | ✅ 整併分散 |
| 即時分析(拍照→成分→適合度) | `/scan`(中央 FAB) | **中央相機 FAB → 即時分析**(判定/成分/需留意/有益/加入試用 + 歷史) | ✅ 用 v2 風格補完佔位畫面 |
| AI 營養師(對話/建議/生成觀察計畫) | `/chat` | **營養師**(對話泡泡/建議題/生成本週觀察計畫/免責聲明) | ✅ 用 v2 風格補完佔位畫面 |
| 產品「成分 / 營養」檢視 | `/products` | 日誌 › 飲食紀錄「成分與營養資訊」展開 + 即時分析結果 | ⚠️ 檢視/分析有對應 |
| 健康狀況量化(體態評分/活力/水分) | 首頁三宮格 | 首頁「健康檔案概覽」(飲食需知/確診疾病/日常症狀標籤) | ⚠️ 概念對應,但 v2 改為標籤卡、無量化指標 |
| 飼主暱稱設定(跨裝置同步) | ClientShell 引導 | Google 登入 + 個人檔案 | ⚠️ 形式改變(v2 採 Google 登入,不保留暱稱輸入流程) |
| 飼主社群討論板 | 首頁「即將推出」teaser | 快訊 (News) placeholder | ⚠️ 兩版皆未實作 |

### ❌ 第二版 UIUX 中「沒有對應位置」的 v1 功能(需您裁示)
1. **固定 / 試用 產品清單管理** — v1 首頁有「固定 / 試用」分頁,可把產品歸類並管理。v2 **沒有**這個清單管理畫面;只有「即時分析」結果裡的「加入試用清單」入口,以及日誌裡的單一產品營養檢視,**但沒有清單檢視 / 管理畫面**。→ 若要保留,需在 v2 新增一個畫面(會超出「完全保留 v2」的範圍,故先不擅自新增)。
2. **健康狀況量化指標**(體態評分 / 活力指數 / 水分攝取)— v2 首頁改為飲食/疾病/症狀標籤,**沒有**量化評分的對應 UI。
3. **飼主暱稱跨裝置同步** — v2 用 Google 帳號,**不保留** 自訂暱稱同步機制。

### 🆕 第二版獨有、已完整保留的新功能
重要日程 / 未來日程表(疫苗·驅蟲·美容·節日倒數)、換食計畫追蹤、洗澡美容紀錄(居家自洗/送洗)、Google 登入、紀錄參數設定(自訂日誌欄位顯示與排序)、AI 隨記語音輸入。

---

## 7. 檔案索引 (Index)

| 路徑 | 說明 |
|---|---|
| `README.md` | 本檔 — 產品脈絡、內容/視覺/圖示基礎、**功能對應報告** |
| `colors_and_type.css` | 顏色 + 字體 token(CSS 變數 + 語意 class) |
| `assets/logo.svg` | 品牌 Logo(可獨立使用) |
| `ui_kits/purepaw_app/` | **主要交付** — v2 風格 + v1 功能整併的高擬真互動 App |
| `preview/` | Design System 分頁卡片(顏色/字體/元件/品牌) |
| `SKILL.md` | Agent Skill 進入點(供 Claude Code 下載使用) |
| `_make/` | (參考) 從 `.make` 還原的 v2 原始碼與圖片 |
| `src/` | (參考) 從 GitHub 匯入的 v1 元件原始碼片段 |

---

## 8. UI Kit

[`ui_kits/purepaw_app/index.html`](ui_kits/purepaw_app/index.html) — 開啟即進入 **Google 登入 → 首頁**,可在側欄/底部列切換:首頁、日誌、相機(即時分析)、營養師、快訊,以及設定。手機與桌面版面皆同一份程式碼。詳見該資料夾的 `README.md`。
