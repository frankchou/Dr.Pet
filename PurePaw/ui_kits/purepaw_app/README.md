# PurePaw App — UI Kit

高擬真、可點擊的 PurePaw 互動原型。**視覺 100% 依第二版 Figma UIUX,功能整併自第一版 Dr.Pet。** 同一份程式碼同時支援手機(底部導覽 + 中央相機 FAB)與桌面(左側邊欄)版面。

開啟 `index.html` → Google 登入頁 → 點「使用 Google 繼續」進入 App。

## 畫面 (Screens)
| 路由 | 畫面 | 來源 |
|---|---|---|
| `/login` | Google 登入(杏色插畫 + 白色表單) | v2 原樣 |
| `/`(首頁) | 毛孩 hero、健康檔案概覽、快速功能、重要日程、未來日程表 | v2 原樣 |
| `/diary`(日誌) | 換食計畫、月/週曆、AI 隨記、用藥看診、洗澡美容、飲食紀錄(完整營養) | v2 原樣 |
| `/settings`(設定) | 毛孩檔案表單(可切換/新增) · 紀錄參數設定 | v2 原樣 |
| `/nutritionist`(營養師) | **v1 AI 對話**(建議題、泡泡、生成觀察計畫、免責聲明)→ 補完 v2 佔位 | v1 功能 + v2 風格 |
| `/scan`(即時分析) | **v1 拍照成分分析**(判定/成分/需留意/有益/加入試用 + 歷史)→ 由相機 FAB 進入 | v1 功能 + v2 風格 |
| `/news`(快訊) | placeholder | v2 原樣 |

## 元件檔 (Components)
- `icons.jsx` — lucide 圖示轉接器(含改名 fallback)、品牌 `LogoSVG`、首頁 duotone `LineFillIcon`
- `Layout.jsx` — 響應式外殼(桌面側欄 + 手機底部列 + sticky header + 個人選單)
- `Home.jsx` — 首頁(hero / 健康卡 / 日程)
- `Diary.jsx` — 日誌(日曆 / AI 隨記 / 快速紀錄 / 飲食營養)
- `Settings.jsx` — 設定(毛孩檔案 / 紀錄參數)+ `Login`、`HandDrawnGraphic`
- `Features.jsx` — `Nutritionist`(聊天)、`Scan`(即時分析)、`News`
- `app.jsx` — 狀態路由 + 掛載

## 技術說明
- React 18 + Babel standalone(瀏覽器內轉譯)。每個 `.jsx` 透過 `Object.assign(window, …)` 匯出元件,跨檔共用。
- 樣式:Tailwind CDN(`tailwind.config` 設定 Quicksand)+ 專案根的 `colors_and_type.css`。
- 圖示:lucide UMD(CDN),與 v2 同款 `lucide-react`。
- 資料皆為前端假資料 / canned;無後端。即時分析與 AI 對話為示範流程。

## 已知取捨
- v1 的「固定/試用 產品清單管理」在 v2 沒有對應畫面(見根目錄 `README.md` 第 6 節);此處僅保留「加入試用清單」入口與日誌內的單品營養檢視。
- `font-black` 因 Quicksand 上限 700,實際渲染為 700。
