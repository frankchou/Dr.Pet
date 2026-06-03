# 工作報告 — Phase 5 Landing Page + 路由清理
**角色：** fullstack-engineer  
**日期：** 2026-06-02  
**負責人：** Phase 5 全端工程師

---

## 新增 / 修改的檔案

### `src/app/landing/layout.tsx`（新建）
空殼 layout，回傳 `<>{children}</>`，覆蓋父層 RootLayout，使 `/landing` 頁面不顯示 Sidebar 和 BottomNav。

### `src/app/landing/page.tsx`（新建）
完整 Landing page，嚴格對照 `PurePaw/landing.html`，包含：

| 區塊 | 說明 |
|---|---|
| Sticky Nav | Logo + 中欄導覽（`hidden md:flex`）+ 登入/CTA |
| Hero | 毛孩 SVG + outline text「每一口」（`WebkitTextStroke`）+ 兩個 CTA |
| Marquee 跑馬燈 | CSS `@keyframes scroll`，以 `<style>` tag 注入 |
| Stats 三格 | 22 / 4+ / 24H，對應品牌顏色 |
| About GEO | 深色卡片，含可引用的品牌說明文字 |
| Features 六宮格 | 2×3 grid，`dangerouslySetInnerHTML` 注入 SVG icon paths |
| How it works | 三步驟，杏色背景 |
| FAQ accordion | 原生 `<details>/<summary>` + `.chev` CSS 旋轉，6 題 |
| CTA | 黑色卡片 + 星星裝飾 + 白色按鈕 |
| Footer | 免責聲明 + 參考來源 + copyright |
| JSON-LD | `WebApplication` + `FAQPage` structured data（SEO/GEO 友善）|

全部 CTA href 指向 `/`（由 ClientShell 攔截到登入）。

### `next.config.ts`（修改）
加入 `async redirects()`，7 條 v1 → v2 永久重新導向（HTTP 301）：

| 舊路由 | 新路由 |
|---|---|
| `/log` | `/diary` |
| `/log/new` | `/diary` |
| `/chat` | `/nutritionist` |
| `/products` | `/diary` |
| `/symptoms` | `/diary` |
| `/symptoms/new` | `/diary` |
| `/upload` | `/scan` |

---

## Build 結果
`npx tsc -b` 無輸出，零型別錯誤。
