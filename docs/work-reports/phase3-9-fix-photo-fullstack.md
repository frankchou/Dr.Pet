# 待辦 3-9 修正：健康卡片「拍照上傳」功能補回（icon 維持純裝飾）

## 背景
先前為了讓 4 張健康卡（皮膚毛髮 / 牙齒口腔 / 消化 / 眼耳）右上角相機 icon
改為不可點，整段「拍照上傳」（hidden file input + 觸發 button）被一併移除，
導致使用者完全無法新增照片。

frank 決策：**拍照上傳功能要保留**，只是右上角那顆 icon 不可點 / 不觸發即可。

## 怎麼加回上傳
在 `SkinHairCard.tsx` 新增共用元件 **`PhotoUploader`**，把原本散落在各卡片
header 的上傳流程集中封裝：

- 沿用原本的上傳流程：`usePhotoUpload`（內含 `handleFileChange` → `POST /api/upload`）。
- 沿用原本的 hidden `<input type="file" accept="image/*" multiple capture="environment">`。
- 沿用原本的 `PhotoStrip` 顯示已上傳縮圖（含刪除）。
- `onPhotosChange` 為 undefined 時整個元件不渲染（沿用 read-only 行為）。

4 張卡片底部由原本的 `<PhotoStrip .../>` 改為 `<PhotoUploader photos onPhotosChange />`，
並移除各卡片中只為拿 `removePhoto` 而呼叫的 `usePhotoUpload`（已收進 PhotoUploader）。

## 新觸發入口
PhotoStrip 下方一顆明確的「**＋ 新增照片**」虛線按鈕（CameraIcon + 文字）：

- 點擊觸發 hidden file input。
- 上傳中顯示「上傳中…」並 disabled。
- hover 變品牌色 `#C4714A`，與卡片其他互動元件一致。

## icon 維持不可點
右上角維持上一波的 `DecorIcon`：純 `<span aria-hidden>`、無 `onClick`、
無 file input，僅保留原本圓底相機外觀。本次未更動其行為。

## props 介面不變
`MultiSelectCardProps`（`value` / `onChange` / `photos` / `onPhotosChange`）完全不變，
`diary/page.tsx` 與 `HealthLogSection` 的使用方式不受影響（本次未動這些檔）。
`PhotoStrip` / `usePhotoUpload` / `CameraIcon` 仍對外 export，無其他元件受影響。

## 動到的檔案
- `src/components/diary/SkinHairCard.tsx`（新增 `PhotoUploader`；卡片改用之）
- `src/components/diary/DentalCard.tsx`
- `src/components/diary/DigestionCard.tsx`
- `src/components/diary/EyeEarCard.tsx`

## tsc 結果
`npx tsc --noEmit`：這 4 個卡片檔案 **無任何型別錯誤**。
唯一一筆錯誤位於 `src/app/diary/page.tsx`（`WeekCalendar` 缺 `onToggleView` prop），
屬另一項進行中任務的未提交改動，**與本任務無關、且不在本任務改動範圍**。
