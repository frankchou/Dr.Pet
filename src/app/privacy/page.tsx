import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '隱私權政策｜PurePaw 無敏毛孩',
  description:
    'PurePaw 無敏毛孩的隱私權政策：我們實際收集哪些資料、如何使用、與哪些第三方服務共享，以及您可以如何查詢、更正或刪除您的資料。',
  alternates: { canonical: '/privacy' },
}

const EFFECTIVE_DATE = '2026 年 9 月 2 日'
const CONTACT_EMAIL = 'purepaw.notify@gmail.com'

/* ─── 版面元件 ─────────────────────────────────────────────────── */

function Section({
  id,
  no,
  title,
  children,
}: {
  id: string
  no: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="bg-white rounded-2xl shadow-sm p-5 scroll-mt-4">
      <h2 className="flex items-center gap-2.5 text-base font-bold text-[#2C1810] mb-3">
        <span className="w-6 h-6 rounded-full bg-[#C4714A] text-white text-xs flex items-center justify-center flex-shrink-0">
          {no}
        </span>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-[1.9] text-[#8B7355]">{children}</div>
    </section>
  )
}

/** 資料類別卡：左側標題 + 實際欄位清單 */
function DataRow({ label, items }: { label: string; items: string }) {
  return (
    <div className="border-l-2 border-[#EADFD3] pl-3.5 py-0.5">
      <p className="text-[13px] font-bold text-[#2C1810] mb-0.5">{label}</p>
      <p className="text-[13px] leading-[1.85] text-[#8B7355]">{items}</p>
    </div>
  )
}

function Callout({ tone = 'note', children }: { tone?: 'note' | 'warn'; children: React.ReactNode }) {
  const styles =
    tone === 'warn'
      ? 'bg-[#FDF3EC] border-[#E8C4A8] text-[#8A4B23]'
      : 'bg-[#F7F3EE] border-[#EADFD3] text-[#6F5B45]'
  return (
    <div className={`rounded-xl border px-4 py-3 text-[13px] leading-[1.85] ${styles}`}>
      {children}
    </div>
  )
}

/* ─── 頁面 ─────────────────────────────────────────────────────── */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* 頂部列 */}
      <header className="sticky top-0 z-10 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EADFD3]">
        <div className="max-w-[480px] mx-auto px-5 h-14 flex items-center justify-between">
          <Link
            href="/landing"
            className="text-sm font-bold text-[#8B7355] hover:text-[#C4714A] transition-colors"
          >
            ← 返回
          </Link>
          <span className="text-sm font-bold text-[#2C1810]">PurePaw 無敏毛孩</span>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-5 py-7 space-y-4">
        {/* 標題區 */}
        <div>
          <h1 className="text-2xl font-bold text-[#2C1810] tracking-tight mb-2">隱私權政策</h1>
          <p className="text-[13px] text-[#8B7355] leading-relaxed">
            生效日期：{EFFECTIVE_DATE}　·　最後更新：{EFFECTIVE_DATE}
          </p>
        </div>

        <Callout>
          我們把這份政策寫得盡量白話，而且<strong className="font-bold">只寫我們真的在做的事</strong>。
          下面列出的每一項資料，都對應到系統裡實際存在的欄位；我們沒有做的事（例如廣告追蹤），也會直接說明沒有做。
        </Callout>

        {/* 1 */}
        <Section id="who" no={1} title="這份政策是誰、管什麼">
          <p>
            「PurePaw 無敏毛孩」（以下稱「本服務」）是一個協助飼主記錄毛孩健康、並以 AI
            協助判讀寵物食品成分與營養的網頁應用程式。本政策說明我們如何收集、使用、共享與保存您在使用本服務時提供的資料。
          </p>
          <p>
            本服務目前由個人開發者營運，聯絡方式為{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#C4714A] underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
            。您開始使用本服務，即表示您已閱讀並理解本政策。
          </p>
        </Section>

        {/* 2 */}
        <Section id="collect" no={2} title="我們實際收集哪些資料">
          <p>以下是本服務資料庫中真實存在的資料項目，依用途分類：</p>

          <div className="space-y-3 pt-1">
            <DataRow
              label="A. 帳號與登入資料"
              items="透過 Google 帳號登入時取得的電子郵件地址、顯示名稱、頭像圖片網址，以及您可自訂的暱稱。系統另會保存 Google 核發的授權憑證（access token / refresh token 等），僅用於維持登入狀態。本服務不會、也無法取得您的 Google 密碼。"
            />
            <DataRow
              label="B. 毛孩基本檔案"
              items="毛孩名字、物種（貓／狗）、品種、性別、生日、體重、是否結紮、過敏原、病史、主要健康問題、大頭照。"
            />
            <DataRow
              label="C. 健康紀錄"
              items="每日健康日誌（胃口、飲水量與狀態、排便型態與細節、排尿狀況、精神活力、情緒、皮膚被毛、眼耳、口腔牙齒、消化、呼吸、神經、生殖等觀察項目）、症狀紀錄（症狀類型、嚴重度、部位、備註）、體態評分與活力指數、量測紀錄（體重、體態、靜止呼吸率、血糖、血壓、體溫）、用藥與看診紀錄（疫苗、驅蟲、處方、看診院所）、洗澡美容紀錄。"
            />
            <DataRow
              label="D. 飲食與產品資料"
              items="每日餐食計畫與份量、毛孩的固定／試用產品清單、產品使用紀錄、每日產品反應評分（良好／普通／不佳）與備註、您回報的產品資料錯誤。"
            />
            <DataRow
              label="E. 您上傳的照片"
              items="毛孩大頭照、症狀照片、日誌中的皮膚被毛／眼耳／口腔／消化照片、健康文件與檢驗報告照片、用藥或美容的藥袋與收據照片、即時分析的食品成分標籤照片。這些檔案儲存於 Vercel Blob 檔案服務，並以「公開網址」形式存放（詳見第 8 節的重要說明）。"
            />
            <DataRow
              label="F. AI 對話與分析結果"
              items="您與 AI 營養師的完整對話內容、AI 產生的關聯分析與建議、營養分析報告、即時成分判讀結果、產品推薦結果、每週照護任務。"
            />
            <DataRow
              label="G. 推播訂閱資料"
              items="若您開啟推播通知，系統會保存瀏覽器提供的推播端點網址（endpoint）與兩組加密金鑰（p256dh、auth），以及您的推播偏好開關。這些資料由瀏覽器產生，不包含您的身分資訊。"
            />
            <DataRow
              label="H. 共同飼主資料"
              items="當您邀請共同飼主時，系統會保存您輸入的受邀者電子郵件地址、邀請連結識別碼、邀請狀態與有效期限，以及成員身分（擁有者／共同飼主）。"
            />
            <DataRow
              label="I. 意見與評論"
              items="您主動送出的問題回報內容、App 評分與評論文字。"
            />
          </div>

          <Callout tone="warn">
            <strong className="font-bold">請特別注意：</strong>
            上述 C、E、F 項屬於敏感的健康相關資料。雖然這些資料描述的是您的毛孩而非您本人，但仍可能間接反映您的生活作息與消費習慣，請在填寫自由輸入欄位（如備註）時避免填入您或他人的身分證字號、金融帳號等個人資料。
          </Callout>
        </Section>

        {/* 3 */}
        <Section id="not-collect" no={3} title="我們沒有收集的東西">
          <p>為了讓您安心，以下是我們<strong className="font-bold">確定沒有做</strong>的事：</p>
          <ul className="space-y-1.5 pl-1">
            {[
              '不收集您的身分證字號、出生年月日、金融帳號或信用卡資訊（本服務目前不收費，沒有金流）。',
              '不收集您的精確地理位置，也不存取您的通訊錄或行事曆。',
              '不安裝 Google Analytics、Facebook Pixel 或任何第三方廣告追蹤程式。',
              '不販售、出租或以行銷為目的把您的資料交給第三方。',
              '不會拿您的資料去訓練我們自己的 AI 模型（我們沒有自建模型）。',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[13px] leading-[1.85]">
                <span className="text-[#C4714A] font-bold flex-shrink-0">·</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 4 */}
        <Section id="purpose" no={4} title="我們為什麼要這些資料">
          <ul className="space-y-1.5 pl-1">
            {[
              ['提供服務本身', '沒有毛孩檔案與健康紀錄，就無法產生日誌、圖表、營養分析與換食建議。'],
              ['產生 AI 分析', '把毛孩的年齡、體重、過敏原、病史與近期日誌交給 AI，才能得到貼近實際狀況的建議，而不是罐頭答案。'],
              ['帳號識別與資料隔離', '用 Google 帳號辨識您是誰，確保您只看得到自己（或被授權）的毛孩資料。'],
              ['共同飼主協作', '讓您指定的家人或照護者能一起記錄同一隻毛孩。'],
              ['推播通知', '在食安警報、用藥與美容提醒到期時通知您（可隨時關閉）。'],
              ['服務維運與除錯', '在系統發生錯誤時，用於排查問題與改善穩定性。'],
            ].map(([h, d]) => (
              <li key={h} className="flex gap-2 text-[13px] leading-[1.85]">
                <span className="text-[#C4714A] font-bold flex-shrink-0">·</span>
                <span>
                  <strong className="font-bold text-[#2C1810]">{h}</strong>
                  ：{d}
                </span>
              </li>
            ))}
          </ul>
          <p>
            我們處理資料的法律基礎是<strong className="font-bold">您的同意</strong>
            （首次使用時的重要聲明同意流程）與<strong className="font-bold">履行服務所必要</strong>。
            您可以隨時撤回同意，方式是停止使用並來信要求刪除資料。
          </p>
        </Section>

        {/* 5 */}
        <Section id="third-party" no={5} title="哪些第三方會接觸到您的資料">
          <p>
            本服務並非全部自行處理。以下是實際參與資料處理的第三方，以及他們各自會拿到什麼：
          </p>

          <div className="space-y-3 pt-1">
            <DataRow
              label="Anthropic（AI 分析服務，美國）"
              items="這是最重要的一項。當您使用即時成分分析、AI 營養師對話、營養報告、症狀建議、月健康總覽、換食計畫等功能時，我們會把相關的毛孩資料（名字、物種、品種、年齡、體重、過敏原、病史、近 30 日的症狀與日誌內容、產品清單、您的提問文字，以及完整的歷史對話紀錄）傳送給 Anthropic 的 Claude 模型進行分析。使用「即時成分分析」與「文件辨識」功能時，您拍攝的照片本身（包含獸醫病歷與檢驗報告照片）也會一併傳送。部分產品查詢功能另會啟用 Anthropic 的網路搜尋工具，該查詢內容會因此連向外部網站。若您不希望健康資料離開本服務，請不要使用 AI 相關功能。"
            />
            <DataRow
              label="Google（登入服務）"
              items="處理您的登入驗證，並提供您的電子郵件、名稱與頭像給本服務。我們不會把毛孩健康資料回傳給 Google。"
            />
            <DataRow
              label="Turso（資料庫代管）"
              items="本服務的資料庫由 Turso 代管，前述第 2 節的所有資料都儲存在其伺服器上。"
            />
            <DataRow
              label="Vercel（網站代管與檔案儲存）"
              items="本服務部署於 Vercel。基於網站運作性質，Vercel 會處理連線的伺服器日誌（例如 IP 位址、瀏覽器類型、請求時間）。此外，您上傳的所有照片檔案都存放在 Vercel Blob 檔案服務上。"
            />
            <DataRow
              label="Gmail SMTP（通知信寄送）"
              items="共同飼主邀請信等系統通知信透過 Google 的 Gmail 寄送，寄送過程會經手收件者的電子郵件地址與信件內容。"
            />
            <DataRow
              label="瀏覽器推播服務"
              items="若您開啟推播，通知內容會經由您瀏覽器廠商的推播服務（例如 Google、Mozilla、Apple 的推播閘道）送達您的裝置。"
            />
          </div>

          <Callout tone="warn">
            上述服務多數位於<strong className="font-bold">美國或其他境外地區</strong>，
            使用本服務即代表您理解並同意您的資料會被傳輸至我國境外處理。各第三方對資料的處理另受其自身隱私政策約束。
          </Callout>

          <p>
            除上述情形外，我們只會在<strong className="font-bold">依法令規定或主管機關、司法機關要求</strong>
            時才揭露您的資料。
          </p>
        </Section>

        {/* 6 */}
        <Section id="co-owner" no={6} title="共同飼主：誰看得到您的毛孩資料">
          <p>
            本服務提供「共同飼主」功能。當您邀請他人成為某隻毛孩的共同飼主並經對方接受後，
            <strong className="font-bold text-[#2C1810]">
              該名共同飼主將可檢視並編輯這隻毛孩的所有資料
            </strong>
            ，包含健康日誌、症狀紀錄、上傳照片、用藥與看診紀錄、飲食計畫，以及與 AI 營養師的完整對話內容。
          </p>
          <p>
            共同飼主除了檢視之外，也<strong className="font-bold">可以修改</strong>毛孩檔案（包含過敏原與病史）與新增／刪除各項紀錄。
            共同飼主唯一不能做的是刪除整隻毛孩，以及發送新的邀請。
          </p>
          <p>
            邀請時您需要輸入對方的電子郵件地址，我們會將該地址保存下來並寄出邀請信；邀請連結
            <strong className="font-bold">自寄出起 7 天內有效</strong>，逾期即失效，且僅限該電子郵件地址的持有人接受。
            成為同一隻毛孩的成員後，成員彼此之間會看到對方的名稱、電子郵件地址與頭像。
          </p>
          <Callout tone="warn">
            <p className="mb-2">
              <strong className="font-bold">請務必在邀請前想清楚，原因有兩點：</strong>
            </p>
            <ul className="space-y-1.5">
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">·</span>
                <span>
                  本服務<strong className="font-bold">目前尚未提供移除共同飼主的功能</strong>。
                  一旦對方接受邀請，您無法自行收回其權限；若確有需要，請來信由我們以人工方式協助處理。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">·</span>
                <span>即使日後移除權限，也無法回收對方已經看過並記住的內容。</span>
              </li>
            </ul>
          </Callout>
        </Section>

        {/* 7 */}
        <Section id="cookies" no={7} title="Cookie 與瀏覽器本機儲存">
          <p>
            我們<strong className="font-bold">不使用廣告或分析類 Cookie</strong>。實際使用到的只有：
          </p>
          <ul className="space-y-1.5 pl-1">
            {[
              ['登入狀態 Cookie', '由登入機制（Auth.js / NextAuth）設定，名稱為 authjs.session-token（HTTPS 下為 __Secure- 前綴），內容是一組簽章過的登入權杖，用於記住您已登入。另有防範跨站請求偽造用的 authjs.csrf-token 與導向用的 authjs.callback-url。這些都是服務運作所必需的，登出後即失效，且無法被其他網站讀取。'],
              ['瀏覽器本機儲存（localStorage）', '存放您的使用者識別碼、暱稱、目前選取的毛孩，以及「是否已同意使用前重要聲明」的紀錄。這些資料只留在您自己的裝置上，清除瀏覽器資料即會消失。'],
            ].map(([h, d]) => (
              <li key={h} className="flex gap-2 text-[13px] leading-[1.85]">
                <span className="text-[#C4714A] font-bold flex-shrink-0">·</span>
                <span>
                  <strong className="font-bold text-[#2C1810]">{h}</strong>
                  ：{d}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 8 */}
        <Section id="retention" no={8} title="資料保留多久、怎麼刪除">
          <p>
            在您使用本服務期間，我們會持續保存您的資料，以維持紀錄的連續性（健康趨勢分析仰賴歷史資料）。
          </p>
          <p>
            <strong className="font-bold text-[#2C1810]">您現在就可以自行刪除的：</strong>
            單筆症狀紀錄、單筆即時分析結果、產品使用紀錄、毛孩產品清單項目、餐食計畫項目，以及
            <strong className="font-bold">整隻毛孩的檔案</strong>。刪除毛孩時，系統會一併連動刪除幾乎所有與該毛孩關聯的資料
            —— 健康日誌、症狀紀錄、量測、用藥、美容、飲食計畫、AI 對話與各項分析結果都會被移除。
          </p>

          <Callout tone="warn">
            <p className="mb-2">
              <strong className="font-bold">以下是我們目前做不到、必須誠實告知的部分：</strong>
            </p>
            <ul className="space-y-1.5">
              {[
                '本服務目前尚未提供「自行刪除整個帳號」的按鈕。若您要刪除帳號與名下所有資料，請來信提出，我們會以人工方式處理。',
                '本服務目前尚未提供「一鍵匯出個人資料」的功能。若您需要取得您的資料副本，請來信申請，我們會以人工方式整理提供。',
                '刪除毛孩不等於刪除帳號。您的帳號資料、Google 授權憑證、推播訂閱、以及您送出過的問題回報與 App 評論，並不會隨毛孩一起被刪除，需要另外來信要求。',
                '您上傳的照片檔案本身，目前不會隨著紀錄或毛孩被刪除而一併移除。這些檔案存放在具有公開網址的檔案服務上，代表任何持有該網址的人（即使未登入）都可能開啟該圖片。若您需要確實清除已上傳的照片，請務必來信告知，我們會以人工方式刪除。',
                '本服務尚未建立自動化的資料保留期限排程。在您未提出刪除要求前，資料會持續保存。',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="font-bold flex-shrink-0">·</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Callout>

          <p>
            以上人工處理的申請，請寄至{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#C4714A] underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
            ，我們會在合理期間內回覆。為確認身分，請使用您註冊時所用的 Google 帳號電子郵件地址來信。
          </p>
        </Section>

        {/* 9 */}
        <Section id="rights" no={9} title="您對自己的資料有哪些權利">
          <p>
            依我國《個人資料保護法》第 3 條，就您的個人資料，您得行使下列權利；若您位於歐盟或其他有類似法規的地區，亦可主張當地法律賦予的對應權利：
          </p>
          <ul className="space-y-1.5 pl-1">
            {[
              '查詢或請求閱覽',
              '請求製給複製本',
              '請求補充或更正',
              '請求停止蒐集、處理或利用',
              '請求刪除',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[13px] leading-[1.85]">
                <span className="text-[#C4714A] font-bold flex-shrink-0">·</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p>
            大部分的查詢與更正，您可以直接在「設定與檔案」頁面自行完成。其餘項目請來信{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#C4714A] underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
            。您也可以選擇不提供某些資料，但這可能導致部分功能無法正常運作（例如未填寫過敏原，AI 就無法據以判讀風險）。
          </p>
        </Section>

        {/* 10 */}
        <Section id="security" no={10} title="我們怎麼保護這些資料">
          <p>
            本服務全站以 HTTPS 加密傳輸；帳號登入完全委由 Google 處理，我們不接觸也不儲存您的密碼；
            存取毛孩資料的伺服器端請求會檢查發出請求者是否為該毛孩的擁有者或共同飼主；推播通知的內容在傳輸過程中為端對端加密。
          </p>
          <Callout tone="warn">
            <strong className="font-bold">但請務必理解以下限制：</strong>
            本服務目前由個人開發者營運，尚未通過任何第三方資安認證，也沒有專責的資安團隊。
            沒有任何網路服務能保證百分之百安全。
            此外，您上傳的照片是以公開網址的形式存放（見第 8 節），並未額外設定存取權限保護。
            <strong className="font-bold">
              因此，請不要上傳您不希望被任何人看到的內容，也請自行評估後再決定健康紀錄要填寫得多詳細。
            </strong>
          </Callout>
          <p>
            若發生可能影響您權益的資料外洩事件，我們會在知悉後盡速以電子郵件通知受影響的使用者，並依《個人資料保護法》相關規定辦理通報。
          </p>
        </Section>

        {/* 11 */}
        <Section id="children" no={11} title="未成年人">
          <p>
            本服務主要設計給成年飼主使用。若您未滿 18 歲，請在法定代理人閱讀本政策並同意後再使用。
            我們不會刻意收集未滿 13 歲兒童的個人資料；若我們得知有此情形，會主動刪除。
          </p>
        </Section>

        {/* 12 */}
        <Section id="change" no={12} title="本政策的變更">
          <p>
            本服務仍在持續開發，功能異動時本政策可能隨之更新。修訂後我們會更新本頁最上方的「最後更新」日期。
            若涉及重大變更（例如新增第三方資料接收者、或擴大資料使用目的），我們會在您下次登入時以明顯方式提示，
            必要時重新取得您的同意。您於變更生效後繼續使用本服務，即視為接受修訂後的內容。
          </p>
        </Section>

        {/* 13 */}
        <Section id="contact" no={13} title="聯絡我們">
          <p>對本政策有任何疑問，或要行使前述任何一項權利，請聯繫：</p>
          <div className="rounded-xl bg-[#F7F3EE] border border-[#EADFD3] px-4 py-3.5">
            <p className="text-[13px] text-[#6F5B45] mb-1">PurePaw 無敏毛孩</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-bold text-[#C4714A] underline underline-offset-2 break-all"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </Section>

        {/* 相關連結 */}
        <div className="pt-1">
          <Link
            href="/terms"
            className="block bg-white rounded-2xl shadow-sm p-4 hover:bg-[#FDFBF8] transition-colors"
          >
            <p className="text-sm font-bold text-[#2C1810]">服務條款 →</p>
            <p className="text-[13px] text-[#8B7355] mt-0.5">使用本服務的規則與免責範圍</p>
          </Link>
        </div>

        <footer className="pt-3 pb-8 text-center">
          <p className="text-[11px] font-bold text-[#C3B5A4]">© 2026 PurePaw 無敏毛孩</p>
        </footer>
      </main>
    </div>
  )
}
