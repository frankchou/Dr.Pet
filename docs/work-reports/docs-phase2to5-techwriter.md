# 工作報告 — Phase 2–5 系統文件更新
**角色：** tech-writer  
**日期：** 2026-06-02  
**負責人：** 技術文件作者

---

## 更新的檔案

### `docs/系統架構.md`（更新）

新增 / 更新段落：
- **路由結構**：補全 `/diary`、`/settings`、`/landing`、`/nutritionist`、`/news` 說明；移除已重新導向的舊路由
- **Landing page 獨立架構**：解釋 `landing/layout.tsx` 覆蓋父層、不含 App shell 的設計原理
- **v1 路由重新導向表**：7 條 301 永久重新導向對應關係
- **日誌頁技術決策**：用藥/美容改用 `/api/symptoms` 的原因（`usages.productId NOT NULL` 限制）

### `docs/系統機制.md`（更新）

新增 / 更新段落：
- **v1 路由重新導向**：原「路由別名計畫（尚未實作）」改為「已實作」，附完整對應表
- **日誌頁機制**（全新節）：AI 隨記流程、換食計畫 localStorage 持久化（`drpet_hasPlan` / `drpet_planStart`）、飲食危險詞偵測清單（12 個）、URL Deep Link 機制（`?section=diet`）
- **即時分析三階段 Modal 流程**：`capture → analyzing → result` 觸發條件、API 呼叫、錯誤降級
- **AI 營養師 messages 陣列設計**：完整歷史傳遞目的、切換寵物清空機制、建議題動態調整
- **紀錄參數設定 localStorage 機制**：`purepaw_record_params` key 格式、13 個參數清單、即時寫入設計

### `docs/版本紀錄.md`（更新）

最上方新增 4 筆（最新在最上）：
- **v2.0.0-phase5**：Landing page + v1 路由重新導向
- **v2.0.0-phase4**：即時分析 + AI 營養師 + 快訊
- **v2.0.0-phase3**：日誌頁
- **v2.0.0-phase2**：首頁 + 設定頁
