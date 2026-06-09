# Phase 3-1 / 3-10 / 3-9 全端實作報告

實作者：全端工程師（Claude Code）
日期：2026-06-09
tsc：`npx tsc --noEmit` 通過（0 errors）；ESLint 4 檔健康卡片 0 警告，其餘為既有警告。

---

## 3-1 頭像上傳（`src/app/settings/page.tsx`）

設定頁編輯的是 **Pet** 的頭像（`PetFormState.avatar`，對應 `Pet.avatar` 欄位）。

變更：
- 移除頭像相機按鈕的 `disabled` 與「頭像上傳即將推出」title，改為可點擊的真實上傳按鈕。
- 新增隱藏 `<input type="file" accept="image/*">`，點按鈕觸發選檔。
- 串既有 `POST /api/upload`（multipart `file`），成功取回 `url` 後 `onUpdate('avatar', url)` 即時預覽。
- 持久化策略：
  - **既有 pet**：上傳成功立即 `PUT /api/pets/:id`（只送 `avatar`，PUT 支援部分更新），toast 提示「頭像已更新」。
  - **新 pet（尚未建立）**：先存進前端 state，按「儲存檔案」建立時隨 `POST /api/pets` body 一併送出（已把 `avatar` 加入 `savePet` body）。
- 加上：上傳中 loading（按鈕轉圈、disabled）、非圖片檔/上傳失敗的紅字錯誤提示、上傳後即時預覽（沿用既有 `<Image>` 顯示 avatar）。

新增 prop：`PetCard.onPersistAvatar`，由父層 `persistAvatar(petId, url)` 提供。

---

## 3-10 隱藏「健康檔案概覽」活力指數 / 水分攝取（`src/app/page.tsx`）

- 新增功能旗標 `const SHOW_VITALITY_HYDRATION = false`（檔案頂部「功能旗標」區）。
- 「健康檔案概覽」中的**活力指數**與**水分攝取**兩張卡以 `{SHOW_VITALITY_HYDRATION && (<>...</>)}` 包起，**程式碼完整保留**，日後把旗標改 `true` 即可開回。
- `healthMetric` / `SvgZap` / `SvgDroplets` 仍被其他區塊及該保留區塊引用，無 unused 警告。
- 已同步更新 `docs/隱藏與保留項目.md` 兩列狀態為「✅ 已隱藏」，並登記重啟方式（改旗標）。

---

## 3-9 週曆健康區塊右上角裝飾 icon 改為不可點（bug）

診斷：週曆各健康卡片右上角 icon——
- 食慾咀嚼（AppetiteCard）、呼吸（RespiratoryCard）、神經（NeuroCard）、生殖與分泌（ReproductiveCard）等：右上角已是**純 SVG**，本來就不可點，無需更動。
- **皮膚毛髮 / 牙齒口腔 / 消化異常 / 五官健康(眼耳)** 四張卡：右上角是 `<button>` 包的相機 icon，會開檔案選擇器上傳照片 → 即 frank 回報「可點且有功能」的裝飾 icon。

修正（只動健康卡片元件，**未動 `src/app/diary/page.tsx`**）：
- 在 `SkinHairCard.tsx` 新增共用 `DecorIcon`：以不可互動的 `<span aria-hidden>` 包 `CameraIcon`，沿用原本圓底配色，外觀不變、移除 hover/click。
- 四張卡的 `CardHeader iconButton` 改用 `<DecorIcon />`，移除 `fileInputRef`、`handleFileChange`、`uploading`、隱藏 `<input>` 與 `onClick`。
- 保留 `usePhotoUpload` 的 `removePhoto` 與 `PhotoStrip`：既有照片仍可顯示/刪除；props 介面（`photos`/`onPhotosChange`）維持不變，故父層 `HealthLogSection`/`diary/page.tsx` 不受影響、無需更動。
- icon 圖案（`CameraIcon` SVG）本身未改。

注意：相機按鈕原本的「新增照片」上傳入口已隨之移除（符合 frank「此 icon 為純裝飾」之認定）。若日後要保留拍照入口但移到別處，需另開待辦。

---

## 動到的檔案
- `src/app/settings/page.tsx`（3-1）
- `src/app/page.tsx`（3-10）
- `src/components/diary/SkinHairCard.tsx`（3-9，新增 `DecorIcon`）
- `src/components/diary/DentalCard.tsx`（3-9）
- `src/components/diary/DigestionCard.tsx`（3-9）
- `src/components/diary/EyeEarCard.tsx`（3-9）
- `docs/隱藏與保留項目.md`（3-10 狀態更新）
- `docs/work-reports/phase3-1-10-9-fullstack.md`（本報告）

未動：`src/app/diary/page.tsx`、`Sidebar.tsx`、`BottomNav.tsx`、三份系統文件、正式庫。未 commit。
