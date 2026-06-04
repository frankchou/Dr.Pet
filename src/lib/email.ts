import nodemailer from 'nodemailer'

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
