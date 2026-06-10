import nodemailer from 'nodemailer'
import { appEnvLabel } from '@/lib/env'

/**
 * 寄信模組 —— 目前走 Gmail SMTP + 應用程式密碼（系統專用帳號）。
 *
 * 未來若改用 Resend / 自有網域 noreply@，只需替換此檔的 transporter 與
 * sendEmail 內部實作，呼叫端（sendInviteEmail 等）完全不用動。
 *
 * 需要的環境變數：
 *   GMAIL_USER          系統專用寄件 Gmail
 *   GMAIL_APP_PASSWORD  該帳號的 16 碼應用程式密碼
 */

const SENDER_NAME = '無敏毛孩 PurePaw'
const BRAND = '#C4714A'

let transporter: nodemailer.Transporter | null = null
// 已通過非空驗證的寄件地址，由 getTransporter() 設定後供 sendEmail 沿用，
// 避免 sendEmail 再次重讀 env 造成隱性耦合。
let verifiedSender: string | null = null

/** 對使用者可控字串做 HTML 跳脫，避免破版或 HTML 注入。 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getTransporter(): { transporter: nodemailer.Transporter; sender: string } {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '') // 去掉 16 碼間的空格

  if (!user || !pass) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD 未設定，無法寄信')
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
    verifiedSender = user
  }
  return { transporter, sender: verifiedSender ?? user }
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

/**
 * 寄送一封信。寄件人固定顯示為「無敏毛孩 PurePaw <GMAIL_USER>」。
 * 失敗時拋出錯誤，由呼叫端決定如何處理（不應讓整個業務流程崩潰）。
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const { transporter: t, sender } = getTransporter()
  await t.sendMail({
    from: `${SENDER_NAME} <${sender}>`,
    to,
    subject,
    html,
  })
}

/**
 * 共同飼主邀請信 —— 組裝信件主旨與 HTML，並寄出。
 */
export async function sendInviteEmail(params: {
  to: string
  petName: string
  inviterName: string
  inviteUrl: string
}): Promise<void> {
  const { to, petName, inviterName, inviteUrl } = params
  const subject = `${inviterName} 邀請你一起照顧「${petName}」🐾`
  const html = buildInviteHtml({ petName, inviterName, inviteUrl })
  await sendEmail({ to, subject, html })
}

/** 系統內部通知收件信箱（產品錯誤回報 / 使用者問題回報 / 評論皆寄此）。 */
const PRODUCT_REPORT_RECIPIENT = 'purepaw.notify@gmail.com'
const INTERNAL_NOTIFY_RECIPIENT = 'purepaw.notify@gmail.com'

/**
 * 產品資料錯誤回報通知信 —— 寄給系統內部信箱。
 *
 * 主旨依環境加前綴區分（appEnvLabel）：本機 / 測試 → `[測試]`、正式 → `[正式]`，
 * 避免測試回報混進正式通知。
 */
export async function sendProductErrorReportEmail(params: {
  productName: string
  brand: string | null
  productId: string
  reporterUserId: string
  isDemo: boolean
  note: string | null
}): Promise<void> {
  const { productName, brand, productId, reporterUserId, isDemo, note } = params
  const envPrefix = appEnvLabel()
  // 主旨去除換行並截長，防 header injection（與內文 escapeHtml 跳脫一致）
  const safeName = productName.replace(/[\r\n]+/g, ' ').slice(0, 120)
  const subject = `${envPrefix} PurePaw 產品資料錯誤回報：${safeName}`
  const html = buildProductReportHtml({ productName, brand, productId, reporterUserId, isDemo, note, envPrefix })
  await sendEmail({ to: PRODUCT_REPORT_RECIPIENT, subject, html })
}

function buildProductReportHtml(params: {
  productName: string
  brand: string | null
  productId: string
  reporterUserId: string
  isDemo: boolean
  note: string | null
  envPrefix: string
}): string {
  // 所有欄位皆可能含使用者輸入（productName / brand / note），一律跳脫。
  const productName = escapeHtml(params.productName)
  const brand = escapeHtml(params.brand ?? '（未提供）')
  const productId = escapeHtml(params.productId)
  const reporterUserId = escapeHtml(params.reporterUserId)
  const isDemo = params.isDemo ? '是（demo 帳號）' : '否'
  const note = params.note ? escapeHtml(params.note) : '（無）'
  const envLabel = escapeHtml(params.envPrefix)
  const row = (label: string, value: string): string =>
    `<tr>
      <td style="padding:8px 0;font-size:13px;color:#8B7355;width:120px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:#2C1810;font-weight:600;">${value}</td>
    </tr>`
  return `
  <div style="margin:0;padding:24px;background:#FAF7F2;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
      <div style="background:${BRAND};padding:24px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:#ffffff;">${envLabel} 產品資料錯誤回報</div>
      </div>
      <div style="padding:28px 28px 32px;">
        <p style="font-size:14px;color:#2C1810;line-height:1.7;margin:0 0 16px;">
          有使用者回報以下產品的資料可能有誤，請核對。
        </p>
        <table style="width:100%;border-collapse:collapse;">
          ${row('產品名稱', productName)}
          ${row('品牌', brand)}
          ${row('產品 ID', productId)}
          ${row('回報者', reporterUserId)}
          ${row('是否 demo', isDemo)}
          ${row('備註', note)}
        </table>
      </div>
    </div>
  </div>`
}

/**
 * 使用者問題回報通知信 —— 寄給系統內部信箱。
 * 主旨依環境加前綴（appEnvLabel）：本機 / 測試 → `[測試]`、正式 → `[正式]`。
 */
export async function sendFeedbackEmail(params: {
  reporterUserId: string
  isDemo: boolean
  category: string | null
  content: string
}): Promise<void> {
  const envPrefix = appEnvLabel()
  const subject = `${envPrefix} PurePaw 使用者問題回報`
  const html = buildFeedbackHtml({ ...params, envPrefix })
  await sendEmail({ to: INTERNAL_NOTIFY_RECIPIENT, subject, html })
}

/**
 * 使用者評論／評分通知信 —— 寄給系統內部信箱。
 * 主旨依環境加前綴（appEnvLabel）：本機 / 測試 → `[測試]`、正式 → `[正式]`。
 */
export async function sendAppReviewEmail(params: {
  reporterUserId: string
  isDemo: boolean
  rating: number
  comment: string | null
}): Promise<void> {
  const envPrefix = appEnvLabel()
  const subject = `${envPrefix} PurePaw 使用者評論`
  const html = buildAppReviewHtml({ ...params, envPrefix })
  await sendEmail({ to: INTERNAL_NOTIFY_RECIPIENT, subject, html })
}

/** 通知信用的兩欄表格列（與產品回報信一致的視覺）。 */
function notifyRow(label: string, value: string): string {
  return `<tr>
      <td style="padding:8px 0;font-size:13px;color:#8B7355;width:120px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:#2C1810;font-weight:600;white-space:pre-wrap;">${value}</td>
    </tr>`
}

/** 通知信外殼（標題列 + 內容），content 已是組好的 HTML 片段。 */
function buildNotifyShell(headerTitle: string, intro: string, tableRows: string): string {
  return `
  <div style="margin:0;padding:24px;background:#FAF7F2;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
      <div style="background:${BRAND};padding:24px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:#ffffff;">${headerTitle}</div>
      </div>
      <div style="padding:28px 28px 32px;">
        <p style="font-size:14px;color:#2C1810;line-height:1.7;margin:0 0 16px;">${intro}</p>
        <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
      </div>
    </div>
  </div>`
}

function buildFeedbackHtml(params: {
  reporterUserId: string
  isDemo: boolean
  category: string | null
  content: string
  envPrefix: string
}): string {
  // content / category 為使用者輸入，一律跳脫。
  const content = escapeHtml(params.content)
  const category = params.category ? escapeHtml(params.category) : '（未分類）'
  const reporterUserId = escapeHtml(params.reporterUserId)
  const isDemo = params.isDemo ? '是（demo 帳號）' : '否'
  const envLabel = escapeHtml(params.envPrefix)
  const rows =
    notifyRow('回報者', reporterUserId) +
    notifyRow('是否 demo', isDemo) +
    notifyRow('分類', category) +
    notifyRow('內容', content)
  return buildNotifyShell(`${envLabel} 使用者問題回報`, '有使用者送出了問題回報，內容如下。', rows)
}

function buildAppReviewHtml(params: {
  reporterUserId: string
  isDemo: boolean
  rating: number
  comment: string | null
  envPrefix: string
}): string {
  const safeRating = Math.max(0, Math.min(5, Math.round(params.rating)))
  const stars = '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating)
  const comment = params.comment ? escapeHtml(params.comment) : '（無留言）'
  const reporterUserId = escapeHtml(params.reporterUserId)
  const isDemo = params.isDemo ? '是（demo 帳號）' : '否'
  const envLabel = escapeHtml(params.envPrefix)
  const rows =
    notifyRow('星等', `${stars}（${safeRating}/5）`) +
    notifyRow('留言', comment) +
    notifyRow('評論者', reporterUserId) +
    notifyRow('是否 demo', isDemo)
  return buildNotifyShell(`${envLabel} 使用者評論`, '有使用者送出了 App 評論，內容如下。', rows)
}

function buildInviteHtml(params: {
  petName: string
  inviterName: string
  inviteUrl: string
}): string {
  // petName / inviterName 來自使用者輸入或 DB，inviteUrl 由系統組裝但一併跳脫更穩
  const petName = escapeHtml(params.petName)
  const inviterName = escapeHtml(params.inviterName)
  const inviteUrl = escapeHtml(params.inviteUrl)
  return `
  <div style="margin:0;padding:24px;background:#FAF7F2;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
      <div style="background:${BRAND};padding:28px 24px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#ffffff;">無敏毛孩 PurePaw</div>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:16px;color:#2C1810;font-weight:700;margin:0 0 16px;">你被邀請成為共同飼主 🐾</p>
        <p style="font-size:15px;color:#2C1810;line-height:1.7;margin:0 0 8px;">
          <strong>${inviterName}</strong> 邀請你一起照顧毛孩
          <strong style="color:${BRAND};">「${petName}」</strong>。
        </p>
        <p style="font-size:14px;color:#8B7355;line-height:1.7;margin:0 0 24px;">
          接受後，你就能一起檢視與記錄 ${petName} 的健康狀況，任何更新雙方都會同步看到。
        </p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${inviteUrl}"
             style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:9999px;">
            接受邀請
          </a>
        </div>
        <p style="font-size:12px;color:#8B7355;line-height:1.6;margin:0 0 4px;">
          按鈕無法點擊時，請複製以下連結到瀏覽器開啟：
        </p>
        <p style="font-size:12px;color:${BRAND};word-break:break-all;margin:0 0 20px;">${inviteUrl}</p>
        <p style="font-size:12px;color:#8B7355;line-height:1.6;margin:0;border-top:1px solid #F0EAE2;padding-top:16px;">
          此邀請連結 7 天內有效。若你並未預期收到這封信，可以直接忽略，不會有任何影響。
        </p>
      </div>
    </div>
  </div>`
}
