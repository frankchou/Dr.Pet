/* PurePaw UI Kit — 營養綜合分析表 (v1 成分綜合分析 整併).
   Lives below 健康指標 on Home. 4 tabs: 風險總覽 / 依產品 / 營養表 / 補充建議.
   v2 visual language; client-side canned data. */

const { useState: useStateA } = React;

const A_SUMMARY = { pet: "布丁", products: 3, ingredients: 22, toxic: 0, warn: 0, caution: 6, safe: 16 };

const A_CAUTION = [
  { name: "葵花油 / 植物油", cat: "油脂" },
  { name: "雞肉", cat: "蛋白質" },
  { name: "牛肉", cat: "蛋白質" },
  { name: "豌豆蛋白 / 植物蛋白", cat: "蛋白質" },
  { name: "馬鈴薯 / 木薯", cat: "碳水" },
  { name: "維生素 D", cat: "維生素" },
];

const A_SAFE = [
  { name: "天然防腐劑（維生素E）", cat: "防腐劑" },
  { name: "益生菌", cat: "益生菌" },
  { name: "益生元 / 菊苣纖維", cat: "益生菌" },
  { name: "牛磺酸", cat: "功能性" },
  { name: "β-胡蘿蔔素 / 葉黃素", cat: "功能性" },
  { name: "魚油 / Omega-3", cat: "油脂" },
  { name: "亞麻籽油", cat: "油脂" },
  { name: "鮭魚 / 魚肉", cat: "蛋白質" },
  { name: "蛋 / 蛋粉", cat: "蛋白質" },
  { name: "甘薯 / 地瓜", cat: "碳水" },
  { name: "維生素 A", cat: "維生素" },
  { name: "維生素 C", cat: "維生素" },
  { name: "葉酸", cat: "維生素" },
  { name: "生物素", cat: "維生素" },
  { name: "蔓越莓", cat: "功能性" },
  { name: "綠茶萃取", cat: "功能性" },
];

const A_NUTRI_RISK = [
  { name: "粗灰分", level: "警示", danger: true, text: "含量 9.5% 明顯偏高，長期恐加速老年犬腎臟病進程並促進泌尿結石形成。" },
  { name: "鈣", level: "留意", danger: false, text: "含量 1.5% 中高水平，長期偏高恐增加結石與腎臟鈣化風險，建議降低攝取。" },
];

const A_PRODUCTS = [
  { name: "自然本色鮭魚", type: "飼料", known: 17, caution: 4, items: [
    { n: "雞肉", c: "蛋白質", s: "caution" }, { n: "鮭魚 / 魚肉", c: "蛋白質", s: "safe" }, { n: "馬鈴薯 / 木薯", c: "碳水", s: "caution" }, { n: "粗灰分", c: "礦物質", s: "caution" },
  ] },
  { name: "好好益菌 潔牙凍乾", type: "牙膏牙粉", known: 3, caution: 2, items: [
    { n: "雞肉", c: "蛋白質", s: "caution" }, { n: "鮭魚 / 魚肉", c: "蛋白質", s: "safe" }, { n: "馬鈴薯 / 木薯", c: "碳水", s: "caution" },
  ] },
  { name: "Inplus 腸道益生菌", type: "保健品", known: 9, caution: 1, items: [
    { n: "益生菌群", c: "保健", s: "safe" }, { n: "菊苣纖維", c: "纖維", s: "caution" },
  ] },
];

const A_NUTRIENTS = [
  { n: "蛋白質", v: "25%", range: "—", st: "正常" },
  { n: "脂肪", v: "15%", range: "—", st: "正常" },
  { n: "粗灰分", v: "9.5%", range: "—", st: "警示", warn: true },
  { n: "粗纖維", v: "3.5%", range: "<8%", st: "正常" },
  { n: "鈣", v: "1.5%", range: "≥0.5% <2.5%", st: "留意", caution: true },
  { n: "磷", v: "0.8%", range: "≥0.4% <1.6%", st: "正常" },
  { n: "鉀", v: "0.6%", range: "—", st: "正常" },
  { n: "鈉", v: "0.4%", range: "≥0.08% <0.5%", st: "正常" },
  { n: "Omega-3", v: "0.5%", range: "—", st: "正常" },
  { n: "Omega-6", v: "2.62%", range: "—", st: "正常" },
];

const A_REFS = "世界動物衛生組織、世界獸醫協會、WSAVA、CAPC、OFA、APOP、NRC、AAFCO（美國飼料管理協會）、FEDIAF、PNA、AAVN、Waltham Petcare Science Institute、農業部動植物防疫檢疫署、農業部食品藥物管理署、農業部、中華民國獸醫師公會全國聯合會、台灣小動物獸醫學會、台灣獸醫內科醫學會、台灣獸醫外科醫學會、國立臺灣大學獸醫專業學院、國立中興大學獸醫學系";

function ABadge({ kind, children }) {
  const m = {
    caution: "bg-[#FACC15] text-white", safe: "bg-[#DCFCE7] text-[#16A34A]",
    warn: "bg-[#FFEDD5] text-[#C2410C]", note: "bg-[#FEF9C3] text-[#854D0E]",
  }[kind] || "bg-slate-100 text-slate-500";
  return <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${m}`}>{children}</span>;
}

function ACollapse({ title, count, color, defaultOpen, children }) {
  const [o, setO] = useStateA(!!defaultOpen);
  return (
    <div>
      <button onClick={() => setO(!o)} className="w-full flex items-center justify-between py-2">
        <span className="font-bold flex items-center gap-1.5" style={{ color }}>{title} <span className="font-bold">({count})</span></span>
        <Icon name={o ? "ChevronUp" : "ChevronDown"} size={18} className="text-slate-400" />
      </button>
      {o && <div className="pb-1">{children}</div>}
    </div>
  );
}

function IngredientAnalysis() {
  const [tab, setTab] = useStateA("risk");
  const [expandProd, setExpandProd] = useStateA(1);
  const s = A_SUMMARY;

  const TABS = [["risk", "風險總覽"], ["product", `依產品 (${s.products})`], ["nutri", "營養表 (1)"], ["supp", "補充建議 (1)"]];

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100"><Icon name="ClipboardList" size={16} /></div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">營養綜合分析表</h2>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <img src="https://images.unsplash.com/photo-1602241628512-459cdd3234fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200" alt="布丁" className="w-12 h-12 rounded-full object-cover object-top shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-slate-900">{s.pet} 的成分分析</h3>
            <p className="text-xs font-bold text-slate-400">分析 {s.products} 項產品 · 比對到 {s.ingredients} 種成分</p>
          </div>
          <button className="text-sm font-bold text-[#D98A53] hover:underline shrink-0">重新整理</button>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[["有毒", s.toxic, "#DC2626", "#FEF2F2"], ["警示", s.warn, "#C2410C", "#FFF7ED"], ["需注意", s.caution, "#CA8A04", "#FEFCE8"], ["安全", s.safe, "#16A34A", "#F0FDF4"]].map(([l, n, c, bg]) => (
            <div key={l} className="rounded-2xl py-3 flex flex-col items-center" style={{ backgroundColor: bg, border: "1px solid rgba(0,0,0,0.04)" }}>
              <span className="text-2xl font-bold" style={{ color: c }}>{n}</span>
              <span className="text-[11px] font-bold mt-0.5" style={{ color: c }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-5 gap-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${tab === k ? "bg-[#111111] text-white shadow-sm" : "text-slate-500 hover:text-black"}`}>{label}</button>
        ))}
      </div>

      {/* 風險總覽 */}
      {tab === "risk" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <ACollapse title="⚡ 需注意成分" count={A_CAUTION.length} color="#CA8A04">
              <div className="space-y-2.5">
                {A_CAUTION.map((it) => (
                  <div key={it.name} className="flex items-center justify-between bg-[#FEFCE8] border border-[#FDE68A] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2.5"><ABadge kind="caution"><Icon name="Zap" size={11} strokeWidth={2.5} /> 需注意</ABadge><span className="font-bold text-slate-900">{it.name}</span></div>
                    <span className="flex items-center gap-1 text-sm font-bold text-slate-400">{it.cat} <Icon name="ChevronDown" size={15} /></span>
                  </div>
                ))}
              </div>
            </ACollapse>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <ACollapse title="📊 營養安全風險" count={A_NUTRI_RISK.length} color="#D98A53">
              <div className="space-y-3">
                {A_NUTRI_RISK.map((r) => (
                  <div key={r.name} className={`rounded-2xl p-4 border ${r.danger ? "bg-[#FEF2F2] border-[#FECACA]" : "bg-[#FEFCE8] border-[#FDE68A]"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2"><Icon name={r.danger ? "OctagonAlert" : "Zap"} size={18} className={r.danger ? "text-[#DC2626]" : "text-[#CA8A04]"} /> {r.name}</h4>
                      <ABadge kind={r.danger ? "warn" : "note"}>{r.level}</ABadge>
                    </div>
                    <p className={`text-xs font-medium leading-relaxed ${r.danger ? "text-[#B91C1C]" : "text-slate-600"}`}>{r.danger && "⚠️ "}{r.text}</p>
                    <div className="text-right mt-2"><span className="text-[11px] font-bold text-[#D98A53]">詳細資訊 ⌄</span></div>
                  </div>
                ))}
              </div>
            </ACollapse>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <ACollapse title="✓ 安全成分" count={A_SUMMARY.safe} color="#16A34A">
              <div className="space-y-2.5">
                {A_SAFE.map((it) => (
                  <div key={it.name} className="flex items-center justify-between bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2.5"><ABadge kind="safe"><Icon name="Check" size={11} strokeWidth={3} /> 安全</ABadge><span className="font-bold text-slate-900">{it.name}</span></div>
                    <span className="flex items-center gap-1 text-sm font-bold text-slate-400">{it.cat} <Icon name="ChevronDown" size={15} /></span>
                  </div>
                ))}
              </div>
            </ACollapse>
          </div>

          <AHowTo />
        </div>
      )}

      {/* 依產品 */}
      {tab === "product" && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {A_PRODUCTS.map((p, i) => (
            <div key={p.name} className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{p.name}</h4>
                  <p className="text-xs font-bold text-slate-400">{p.type} · {p.known} 種已知成分</p>
                </div>
                <ABadge kind="caution">{p.caution} 注意</ABadge>
                <button onClick={() => setExpandProd(expandProd === i ? -1 : i)} className="text-slate-400"><Icon name={expandProd === i ? "ChevronUp" : "ChevronDown"} size={18} /></button>
                <Icon name="Pencil" size={16} className="text-slate-300" />
              </div>
              {expandProd === i && (
                <div className="space-y-2 mt-3">
                  {p.items.map((it) => (
                    <div key={it.n} className={`flex items-center justify-between rounded-2xl px-4 py-2.5 border ${it.s === "safe" ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FEFCE8] border-[#FDE68A]"}`}>
                      <div className="flex items-center gap-2.5">{it.s === "safe" ? <ABadge kind="safe"><Icon name="Check" size={11} strokeWidth={3} /> 安全</ABadge> : <ABadge kind="caution"><Icon name="Zap" size={11} strokeWidth={2.5} /> 需注意</ABadge>}<span className="font-bold text-slate-900">{it.n}</span></div>
                      <span className="flex items-center gap-1 text-sm font-bold text-slate-400">{it.c} <Icon name="ChevronDown" size={15} /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 營養表 */}
      {tab === "nutri" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-[#FEF1E2] border border-[#F3D9BE] rounded-2xl p-4">
            <p className="font-bold text-[#9A6233] mb-1">每日攝取量估算（布丁 9.2kg）</p>
            <p className="text-sm font-medium text-[#9A6233] leading-relaxed">乾糧參考餵食量約為體重 × 2-3%，即 230–276 g/天。實際依產品說明為準。</p>
          </div>
          <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"><span className="font-bold text-sm text-slate-800">各產品營養素合計（1 種產品）</span><span className="text-[11px] font-bold text-slate-400">加總估算值</span></div>
            <table className="w-full text-left">
              <thead className="text-[11px] font-bold text-slate-400 bg-slate-50"><tr><th className="px-4 py-2">營養素</th><th className="px-2 py-2">合計</th><th className="px-2 py-2 hidden sm:table-cell">來源</th><th className="px-2 py-2">建議範圍</th><th className="px-3 py-2 text-right">AI 狀態</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {A_NUTRIENTS.map((n) => (
                  <tr key={n.n} className="text-sm">
                    <td className="px-4 py-2.5 font-bold text-slate-700">{n.n}</td>
                    <td className={`px-2 py-2.5 font-bold ${n.warn ? "text-[#C2410C]" : n.caution ? "text-[#CA8A04]" : "text-slate-900"}`}>{n.v}{n.warn && " ⚠️"}</td>
                    <td className="px-2 py-2.5 hidden sm:table-cell"><span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">自然本色鮭魚</span></td>
                    <td className="px-2 py-2.5 text-[11px] font-medium text-slate-400">{n.range}</td>
                    <td className="px-3 py-2.5 text-right"><ABadge kind={n.warn ? "warn" : n.caution ? "note" : "safe"}>{n.st}</ABadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] font-medium text-slate-400 px-4 py-3">* 無 AAFCO 對照標準的營養素僅顯示合計值，可透過 AI 分析獲得建議</p>
          </div>

          {/* AI 整體評估 */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[24px] p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold flex items-center gap-2 text-slate-900"><Icon name="AlertTriangle" size={18} className="text-[#CA8A04]" /> AI 整體評估</h4>
              <button className="flex items-center gap-1.5 text-xs font-bold text-[#D98A53] border border-slate-200 rounded-full px-3 py-1.5"><Icon name="RefreshCw" size={13} /> 重新分析</button>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mb-2">上次分析：2/27 下午11:57</p>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">布丁目前的飲食營養素整體落在可接受範圍內，但粗灰分偏高（9.5%）需特別關注，對於 10 歲的老年犬而言，腎臟代謝礦物質的能力已逐漸下降，高灰分可能加重腎臟負擔。鈣質（1.5%）雖未超過 AAFCO 上限，但在高灰分背景下建議密切監控，並定期進行腎功能血液檢查。</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 mb-3">各營養素分析</p>
            <div className="space-y-2.5">
              {[["蛋白質", "safe", "含量 25% 正常，老年犬應選高生物利用率動物性蛋白，建議定期監測腎功能。"], ["脂肪", "safe", "含量 15% 正常，持續監控體重與體態，必要時微幅降低攝取。"], ["粗灰分", "warn", "含量 9.5% 明顯偏高，長期恐加速老年犬腎臟病進程並促進泌尿結石形成。"], ["Omega-6", "safe", "含量 2.62% 正常，與 Omega-3 比例理想，避免過度增加 Omega-6 防止慢性發炎。"]].map(([n, st, txt]) => (
                <div key={n} className={`rounded-2xl p-4 border ${st === "warn" ? "bg-[#FFFBEB] border-[#FDE68A]" : "bg-[#F0FDF4] border-[#BBF7D0]"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h5 className="font-bold text-slate-900 flex items-center gap-1.5">{st === "warn" ? <Icon name="OctagonAlert" size={16} className="text-[#DC2626]" /> : <Icon name="CheckCircle2" size={16} className="text-[#16A34A]" />} {n}</h5>
                    <ABadge kind={st === "warn" ? "warn" : "safe"}>{st === "warn" ? "警示" : "安全"}</ABadge>
                  </div>
                  <p className={`text-xs font-medium leading-relaxed ${st === "warn" ? "text-[#B91C1C]" : "text-slate-600"}`}>{st === "warn" && "⚠️ "}{txt}</p>
                  <div className="text-right mt-1"><span className="text-[11px] font-bold text-[#D98A53]">詳細資訊 ⌄</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-5">
            <p className="font-bold text-slate-900 mb-3">整體建議</p>
            <ul className="space-y-2.5 text-sm font-medium text-slate-600 leading-relaxed list-disc pl-4">
              <li>定期進行老年犬健康檢查：每 6 個月安排一次完整血液檢查（含 BUN、肌酸酐、SDMA、電解質）及尿液分析，及早掌握腎臟功能狀況。</li>
              <li>優先選擇針對老年犬設計的低灰分、適磷配方食品，目標將粗灰分降至 7% 以下、磷控制在 0.5-0.8%，並搭配高品質動物性蛋白質來源。</li>
              <li>管理日常零食與額外補充品的攝取，將零食熱量控制在每日總熱量的 10% 以內；建議諮詢獸醫師或寵物臨床營養師依體態評分（BCS）量身制定餵食計畫。</li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed"><span className="text-slate-500">資料參考來源：</span>{A_REFS}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="font-bold text-slate-800 mb-2 text-sm">說明</p>
            <ul className="text-xs font-medium text-slate-500 leading-relaxed space-y-1">
              <li>· 合計值為各產品標示值直接加總，代表最高負荷上限估算</li>
              <li>· <span className="text-[#C2410C] font-bold">橘色/偏高</span>：超過 AAFCO 建議上限</li>
              <li>· <span className="text-[#3B6BD6] font-bold">藍色/偏低</span>：低於 AAFCO 最低需求</li>
              <li>· AI 分析結合寵物體型與物種，提供個人化建議，僅供參考</li>
              <li>※ AAFCO = 美國飼料管理協會（Association of American Feed Control Officials）</li>
            </ul>
          </div>
        </div>
      )}

      {/* 補充建議 */}
      {tab === "supp" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <p className="text-sm font-bold text-slate-400">根據 布丁 的症狀記錄，建議補充以下營養：</p>
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[24px] p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span> 乳鐵蛋白</h4>
              <span className="text-xs font-bold text-[#B91C1C]">強烈建議</span>
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed mb-3">目前飲食中未含乳鐵蛋白。乳鐵蛋白可抑制眼部分泌物細菌增生，直接針對淚痕問題。</p>
            <p className="text-xs font-bold text-slate-400">建議來源：犬貓專用乳鐵蛋白粉、含乳鐵蛋白的保健品</p>
          </div>
          <AHowTo />
        </div>
      )}
    </div>
  );
}

function RecCard({ name, desc, pros, avoid, tip }) {
  return (
    <div className="bg-[#FFFBF7] border border-[#F0E3D6] rounded-2xl p-4">
      <h4 className="font-bold text-[#D98A53] leading-snug mb-2">{name}</h4>
      <p className="text-xs font-medium text-slate-600 leading-relaxed mb-3">{desc}</p>
      <div className="space-y-1.5">
        {pros.map((p, i) => (<p key={i} className="text-xs font-medium text-[#16A34A] leading-relaxed flex gap-1.5"><span className="shrink-0">✓</span>{p}</p>))}
        {avoid.map((a, i) => (<p key={i} className="text-xs font-medium text-[#DC2626] leading-relaxed flex gap-1.5 bg-[#FEF2F2] rounded-lg px-2 py-1.5"><span className="shrink-0">✕ 避開</span>{a}</p>))}
      </div>
      <p className="text-[11px] font-medium text-slate-400 leading-relaxed mt-2.5">💡 {tip}</p>
    </div>
  );
}

function AHowTo() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-2xl p-4">
        <p className="font-bold text-slate-800 mb-2 text-sm">如何獲得更完整的分析？</p>
        <ul className="text-xs font-medium text-slate-500 leading-relaxed space-y-1">
          <li>· 在「日誌」中記錄所有正在使用的食品/用品</li>
          <li>· 用「照相」功能拍攝成分表，讓 AI 自動萃取成分</li>
          <li>· 在「日誌」頁記錄症狀，獲得針對性補充建議</li>
        </ul>
      </div>

      {/* 法律免責聲明 */}
      <div className="bg-[#FEF9F4] border border-[#F0E3D6] rounded-2xl p-4">
        <p className="text-[11px] font-bold text-[#9A6233] leading-relaxed flex gap-1.5">
          <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
          <span>本系統之成分與營養分析由 AI 自動生成，<span className="font-bold">不具任何醫療診斷效力</span>，所有內容僅供參考，無法取代專業獸醫師之診斷與處置。實際餵食與用藥請務必諮詢您的獸醫師。</span>
        </p>
      </div>

      {/* 資料參考來源 */}
      <div className="bg-slate-50 rounded-2xl p-4">
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed"><span className="font-bold text-slate-500">資料參考來源：</span>{A_REFS}</p>
      </div>
    </div>
  );
}

Object.assign(window, { IngredientAnalysis });
