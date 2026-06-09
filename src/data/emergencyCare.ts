/**
 * 全台各縣市優良緊急照護機構（24 小時 / 急診）靜態清單。
 *
 * 待辦 3-6：SOS 緊急協助列表的資料來源。
 * ⚠️ 正式清單 frank 之後會提供 —— 屆時把完整資料填進 `EMERGENCY_CARE_LIST` 即可，
 *    UI（搜尋 / 列表 / 空狀態）會自動套用，不需改元件。
 *
 * 填寫方式：
 *  - 每筆是一個 `EmergencyCareItem`，必填 `id` / `name` / `city`。
 *  - `phone` / `address` / `hours` / `note` 可選；缺漏時 UI 會自動隱藏該行。
 *  - `city` 請填縣市名（如「臺北市」「新北市」），供依縣市搜尋與分組顯示。
 *
 * 下方目前為 2～3 筆示意資料，方便驗證長相，正式上線前請替換。
 */

export interface EmergencyCareItem {
  /** 唯一識別碼（任意穩定字串即可，如機構代號或縣市縮寫+流水號） */
  id: string
  /** 機構名稱 */
  name: string
  /** 縣市（如「臺北市」「臺中市」「高雄市」） */
  city: string
  /** 聯絡電話 */
  phone?: string
  /** 地址 */
  address?: string
  /** 營業 / 急診時段（如「24 小時」「夜間 20:00–08:00」） */
  hours?: string
  /** 補充說明（如「需先電話聯絡」「設有加護病房」） */
  note?: string
}

/** 緊急照護機構清單（示意資料，正式內容待 frank 提供後替換）。 */
export const EMERGENCY_CARE_LIST: EmergencyCareItem[] = [
  {
    id: 'sample-tpe-01',
    name: '（示意）台北 24 小時動物急診醫院',
    city: '臺北市',
    phone: '02-0000-0000',
    address: '臺北市中山區（示意地址）',
    hours: '24 小時',
    note: '示意資料，正式清單待提供',
  },
  {
    id: 'sample-nwt-01',
    name: '（示意）新北市夜間動物急診中心',
    city: '新北市',
    phone: '02-1111-1111',
    address: '新北市板橋區（示意地址）',
    hours: '夜間 20:00–08:00',
    note: '示意資料，正式清單待提供',
  },
  {
    id: 'sample-tch-01',
    name: '（示意）台中急重症動物醫院',
    city: '臺中市',
    phone: '04-2222-2222',
    address: '臺中市西屯區（示意地址）',
    hours: '24 小時',
    note: '示意資料，正式清單待提供',
  },
]
