import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '服務條款｜PurePaw 無敏毛孩',
  description:
    'PurePaw 無敏毛孩的服務條款：本服務為 AI 生成的資訊整理與衛教參考，非醫療診斷、不取代專業獸醫師。內含使用規則、資料來源引用聲明與責任限制。',
  alternates: { canonical: '/terms' },
}

const EFFECTIVE_DATE = '2026 年 9 月 2 日'
const CONTACT_EMAIL = 'purepaw.notify@gmail.com'

/** 與首次使用「使用前重要聲明」彈窗（ClientShell）逐字一致的核心條款。 */
const CORE_CLAUSES: { title: string; body: string }[] = [
  {
    title: '服務性質',
    body: '本服務所提供之寵物營養分析、成分判讀、換食與補充建議，均由 AI 系統根據您提供的資料自動生成，屬於資訊整理與衛教參考。',
  },
  {
    title: '非醫療診斷',
    body: '本服務不構成、也無法取代專業獸醫師的醫療診斷、治療或處方。任何健康疑慮、疾病處置與用藥決定，均應以您的獸醫師臨床判斷為準。',
  },
  {
    title: '資訊正確性',
    body: 'AI 分析結果可能因資料不完整、產品標示差異或模型限制而有誤差。本服務不保證所有資訊之即時性、完整性與正確性，內容僅供參考。',
  },
  {
    title: '個人化限制',
    body: '每隻毛孩的年齡、品種、病史與體質皆不同。系統提供之建議為一般性參考，實際餵食份量、保健品與處方請務必與獸醫師討論後再行調整。',
  },
  {
    title: '緊急狀況',
    body: '若您的毛孩出現嘔吐、拒食、呼吸困難、中毒或其他急性症狀，請立即就醫，切勿僅依賴本服務之建議延誤治療。',
  },
  {
    title: '資料與隱私',
    body: '您所輸入的毛孩資料僅用於產生分析結果與改善服務體驗，我們將依個資相關法規妥善保管。',
  },
  {
    title: '同意條款',
    body: '點選「我已閱讀並同意」即表示您已充分理解上述內容，並同意在知悉前述限制的前提下使用本服務。',
  },
]

/** 與 src/lib/utils.ts 的 VET_REFERENCE_SCOPE 一致的完整資料參考來源。 */
const VET_REFERENCES = [
  '世界動物衛生組織（World Organisation for Animal Health）',
  '世界獸醫協會（World Veterinary Association）',
  '世界小動物獸醫師協會（WSAVA）',
  'Companion Animal Parasite Council（CAPC）',
  'Orthopedic Foundation for Animals（OFA）',
  'Association for Pet Obesity Prevention（APOP）',
  'NRC（National Research Council）',
  'AAFCO（美國飼料管理協會）',
  'FEDIAF（歐洲寵物食品工業聯合會）',
  'Pet Nutrition Alliance（PNA）',
  'American Academy of Veterinary Nutrition（AAVN）',
  'Waltham Petcare Science Institute',
  '農業部動植物防疫檢疫署',
  '農業部食品藥物管理署',
  '農業部',
  '中華民國獸醫師公會全國聯合會',
  '台灣小動物獸醫學會',
  '台灣獸醫內科醫學會',
  '台灣獸醫外科醫學會',
  '國立臺灣大學獸醫專業學院',
  '國立中興大學獸醫學系',
]

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

function Bullets({ items }: { items: (string | [string, string])[] }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((item) => {
        const key = Array.isArray(item) ? item[0] : item
        return (
          <li key={key} className="flex gap-2 text-[13px] leading-[1.85]">
            <span className="text-[#C4714A] font-bold flex-shrink-0">·</span>
            <span>
              {Array.isArray(item) ? (
                <>
                  <strong className="font-bold text-[#2C1810]">{item[0]}</strong>：{item[1]}
                </>
              ) : (
                item
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/* ─── 頁面 ─────────────────────────────────────────────────────── */

export default function TermsPage() {
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
          <h1 className="text-2xl font-bold text-[#2C1810] tracking-tight mb-2">服務條款</h1>
          <p className="text-[13px] text-[#8B7355] leading-relaxed">
            生效日期：{EFFECTIVE_DATE}　·　最後更新：{EFFECTIVE_DATE}
          </p>
        </div>

        {/* 最重要的一句話 */}
        <div className="rounded-2xl bg-[#2C1810] px-5 py-4">
          <p className="text-sm font-bold text-white leading-[1.85]">
            先講最重要的一件事：PurePaw 是資訊整理與衛教參考工具，
            <span className="text-[#F0C4A4]">不是醫療服務，也不能取代您的獸醫師。</span>
            毛孩有任何健康疑慮或急性症狀，請立即就醫。
          </p>
        </div>

        {/* 1 */}
        <Section id="accept" no={1} title="條款的接受">
          <p>
            本服務條款（以下稱「本條款」）構成您與「PurePaw 無敏毛孩」（以下稱「本服務」）之間的協議。
            當您登入或以任何方式使用本服務，即表示您已閱讀、理解並同意受本條款拘束。若您不同意其中任何一部分，請停止使用本服務。
          </p>
          <p>
            首次登入時，本服務會顯示「使用前重要聲明」並要求您閱讀後點選同意。該聲明的內容即為下列第 2 節，
            與本條款具有同等效力。
          </p>
        </Section>

        {/* 2 */}
        <Section id="core" no={2} title="核心聲明（與首次使用同意內容一致）">
          <div className="space-y-3.5">
            {CORE_CLAUSES.map((clause, idx) => (
              <div key={clause.title} className="border-l-2 border-[#EADFD3] pl-3.5 py-0.5">
                <p className="text-[13px] font-bold text-[#2C1810] mb-0.5">
                  2.{idx + 1}　{clause.title}
                </p>
                <p
                  className={`text-[13px] leading-[1.85] ${
                    idx === 1 ? 'text-[#2C1810] font-bold' : 'text-[#8B7355]'
                  }`}
                >
                  {clause.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* 3 */}
        <Section id="ai" no={3} title="關於 AI 生成內容">
          <p>
            本服務的成分判讀、營養分析、症狀觀察建議、換食計畫、月健康總覽與 AI
            營養師對話，都是由大型語言模型自動生成的。這代表：
          </p>
          <Bullets
            items={[
              ['可能出錯', 'AI 有可能誤讀成分標籤、遺漏成分，或產生看似合理但實際上不正確的內容。'],
              ['不具診斷效力', 'AI 產出的任何文字都不是診斷、不是處方，也不構成任何醫療、營養或法律上的專業意見。'],
              ['僅反映您提供的資料', '若您填寫的毛孩檔案不完整或有誤，分析結果也會隨之失準。'],
              ['產品資訊以實物為準', '成分辨識結果可能與包裝實際標示不符，請務必以產品實際包裝標示為準。'],
              ['快訊亦為 AI 生成', '快訊與食安警報的內容同樣由 AI 生成，並非擷取自主管機關的即時公告，其標示的來源可能不精確。詳見第 4 節。'],
            ]}
          />
          <Callout tone="warn">
            <strong className="font-bold">請您務必自行判斷。</strong>
            在依據本服務任何建議調整毛孩的飲食、保健品或用藥之前，請先與您的獸醫師討論。
            因採信本服務內容而未及時就醫、或造成毛孩健康受損，本服務不負責任。
          </Callout>
        </Section>

        {/* 4 */}
        <Section id="sources" no={4} title="資料來源與引用聲明">
          <p>
            本服務的 AI 提示詞會指定模型參照下列獸醫與寵物營養領域的權威來源作為知識範圍，
            以提高內容的可靠度：
          </p>
          <div className="rounded-xl bg-[#F7F3EE] border border-[#EADFD3] px-4 py-3.5">
            <ul className="space-y-1">
              {VET_REFERENCES.map((r) => (
                <li key={r} className="text-[12px] leading-[1.8] text-[#6F5B45] flex gap-2">
                  <span className="text-[#C4714A] flex-shrink-0">·</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <Callout>
            上述機構<strong className="font-bold">並未參與本服務的開發，也未對本服務的內容進行審閱、背書或認證</strong>。
            列出它們僅為說明 AI 的知識參照範圍。各機構名稱與標誌之權利均屬其各自所有人，本服務僅為指示性引用，
            不表示與其有任何合作、贊助或從屬關係。
          </Callout>
          <p>
            <strong className="font-bold text-[#2C1810]">關於「快訊」與「食安警報」：</strong>
            本服務快訊區的文章，目前
            <strong className="font-bold">同樣是由 AI 依前述知識範圍自動生成的衛教與風險提示內容</strong>，
            並非即時擷取自政府機關或新聞媒體的原始公告。文章中顯示的來源名稱與連結由 AI 一併產出，
            <strong className="font-bold">可能不精確，也可能無法連結至真實存在的頁面</strong>。
          </p>
          <Callout tone="warn">
            因此，快訊與食安警報僅供您留意與查證的起點，
            <strong className="font-bold">不得作為特定品牌或產品有安全疑慮的認定依據</strong>。
            如需確認寵物食品的召回、下架或違規資訊，請務必以農業部、食品藥物管理署等主管機關的官方公告為準。
            若其中提及任何品牌或產品，並不代表本服務對該品牌或產品的品質作出任何事實陳述或指控。
          </Callout>
          <p>
            <strong className="font-bold text-[#2C1810]">政府開放資料：</strong>
            本服務未來若導入我國政府機關依《政府資訊公開法》公開之開放資料，將於本頁明確標示來源與授權條款，
            並依各資料集之開放授權規定使用。開放資料之正確性與即時性由原發布機關負責。
          </p>
          <p>
            若您認為本服務有任何內容侵害您的著作權或其他權利，請來信{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#C4714A] underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
            ，我們會儘速查明並處理。
          </p>
        </Section>

        {/* 5 */}
        <Section id="account" no={5} title="帳號與共同飼主">
          <Bullets
            items={[
              ['帳號取得', '本服務透過 Google 帳號登入。您應確保該帳號的安全，並對該帳號下的一切活動負責。'],
              ['資料正確性', '請提供正確的毛孩資料。填寫錯誤的體重、年齡或過敏原，會直接導致分析結果失準。'],
              ['共同飼主', '您可以邀請他人共同管理某隻毛孩。受邀者接受後，將能檢視並編輯該毛孩的全部資料，包含健康紀錄、照片與 AI 對話內容。邀請連結 7 天內有效，且僅限您指定的電子郵件地址接受。'],
              ['共同飼主無法自行移除', '本服務目前尚未提供移除共同飼主的功能。對方一旦接受邀請，您無法自行收回權限，必須來信由我們人工協助。請務必只邀請您確實信任的人。'],
              ['他人資料', '若您輸入的內容涉及其他人（例如受邀者的電子郵件地址），您應確保已取得對方同意。'],
            ]}
          />
        </Section>

        {/* 6 */}
        <Section id="acceptable" no={6} title="使用規則">
          <p>使用本服務時，請不要：</p>
          <Bullets
            items={[
              '將本服務用於任何違法目的，或用於為他人提供獸醫診療服務。',
              '以自動化程式大量抓取、複製本服務的內容或干擾服務運作。',
              '嘗試繞過權限控制，存取不屬於您的毛孩資料。',
              '上傳含有病毒、惡意程式，或侵害他人權利、令人不適的內容。',
              '將本服務產生的 AI 內容包裝成專業獸醫意見對外散布。',
            ]}
          />
          <p>
            若您違反上述規則，我們得在不另行通知的情況下暫停或終止您的使用權限。
          </p>
        </Section>

        {/* 7 */}
        <Section id="ip" no={7} title="智慧財產與您的內容">
          <p>
            本服務的介面設計、程式碼、文字與圖像（不含您上傳的內容與第三方素材）之權利均屬本服務所有。
            未經同意，請勿重製、改作或作商業使用。
          </p>
          <p>
            <strong className="font-bold text-[#2C1810]">您上傳的內容仍然是您的。</strong>
            您上傳照片、填寫日誌或與 AI 對話時，僅授權我們在<strong className="font-bold">提供本服務所必要的範圍內</strong>
            儲存、處理該內容，並在您使用 AI 功能時將其傳送給 AI 服務供應商進行分析。
            我們不會將您的內容用於行銷宣傳，也不會公開展示。
          </p>
          <p>
            若您主動使用「分享至社群」類功能（例如將產品使用反應分享至社群推薦池），
            我們會依該功能的說明使用您分享的資料。
          </p>
        </Section>

        {/* 8 */}
        <Section id="availability" no={8} title="服務可用性與變更">
          <p>
            本服務以<strong className="font-bold">「現狀」（as is）與「現有可用」</strong>之基礎提供，
            我們不保證服務不中斷、無錯誤，也不保證任何特定的可用率或回應時間。
          </p>
          <Bullets
            items={[
              '我們可能因維護、升級、第三方服務（AI、資料庫、代管、寄信）異常或不可抗力而暫停服務。',
              '我們可能隨時新增、修改或移除任何功能，包含免費功能。',
              '本服務目前為免費提供，日後如導入收費機制，我們會事先公告，並在您明示同意前不會向您收取任何費用。',
              '我們可能終止本服務的營運。屆時會盡可能提前通知，讓您有時間取回資料。',
            ]}
          />
          <Callout tone="warn">
            請不要把本服務當作毛孩健康資料的<strong className="font-bold">唯一保存處</strong>。
            重要的病歷、檢驗報告與用藥紀錄，請另行保留您自己的副本。
          </Callout>
        </Section>

        {/* 9 */}
        <Section id="liability" no={9} title="責任限制">
          <p>
            在法律允許的最大範圍內，對於因使用或無法使用本服務所生的任何間接、附隨、衍生性損害，
            包含但不限於毛孩健康受損、醫療費用支出、資料遺失、營業損失，本服務不負賠償責任。
          </p>
          <p>
            本節不排除或限制依法不得排除的責任，包括因故意或重大過失所生的責任、以及消費者依《消費者保護法》所享有的權利。
          </p>
          <Callout>
            再次提醒：本服務不是醫療服務。毛孩的健康決定應由您與您的獸醫師共同作成，本服務僅是輔助您整理資訊的工具。
          </Callout>
        </Section>

        {/* 10 */}
        <Section id="privacy" no={10} title="隱私權">
          <p>
            我們如何收集、使用與保護您的資料，詳見{' '}
            <Link href="/privacy" className="font-bold text-[#C4714A] underline underline-offset-2">
              隱私權政策
            </Link>
            ，該政策為本條款之一部分。其中特別說明了使用 AI 功能時，毛孩健康資料與照片會被傳送至第三方 AI 服務供應商處理，
            請您務必一併閱讀。
          </p>
        </Section>

        {/* 11 */}
        <Section id="change" no={11} title="條款的變更">
          <p>
            本服務仍在持續開發，本條款可能隨功能演進而修訂。修訂時我們會更新本頁最上方的「最後更新」日期。
          </p>
          <p>
            若屬<strong className="font-bold">重大變更</strong>（例如導入收費、變更責任範圍、或新增資料使用目的），
            我們會在您下次登入時以明顯方式提示，必要時重新請您確認同意。您於變更生效後繼續使用本服務，
            即視為接受修訂後的條款；若您不同意，請停止使用並可來信要求刪除您的資料。
          </p>
        </Section>

        {/* 12 */}
        <Section id="law" no={12} title="準據法與管轄">
          <p>
            本條款之解釋與適用，以及因本條款所生之爭議，均以中華民國法律為準據法，
            並以臺灣臺北地方法院為第一審管轄法院，但不影響消費者依法享有的小額訴訟或其他法定管轄權益。
          </p>
          <p>
            本條款任一條款若經認定無效，不影響其餘條款之效力。
          </p>
        </Section>

        {/* 13 */}
        <Section id="contact" no={13} title="聯絡我們">
          <p>對本條款有任何疑問，請聯繫：</p>
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
            href="/privacy"
            className="block bg-white rounded-2xl shadow-sm p-4 hover:bg-[#FDFBF8] transition-colors"
          >
            <p className="text-sm font-bold text-[#2C1810]">隱私權政策 →</p>
            <p className="text-[13px] text-[#8B7355] mt-0.5">我們收集哪些資料、如何使用與刪除</p>
          </Link>
        </div>

        <footer className="pt-3 pb-8 text-center">
          <p className="text-[11px] font-bold text-[#C3B5A4]">© 2026 PurePaw 無敏毛孩</p>
        </footer>
      </main>
    </div>
  )
}
