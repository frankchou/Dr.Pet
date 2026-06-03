/* PurePaw UI Kit — Integrated v1 features rebuilt in v2 visual language.
   • Nutritionist  → v1 "AI 營養師" chat (suggested prompts, bubbles, plan)
   • Scan          → v1 "即時分析" ingredient-label analysis + history
   • News          → kept as v2 placeholder content
   All client-side / canned; no backend. */

const { useState, useEffect, useRef } = React;

/* ---------------- AI 營養師 (chat) ---------------- */
const CANNED_REPLY =
  "根據布丁的檔案（黃金獵犬・腎臟病），建議優先選擇「低磷、中等蛋白」的處方配方，並留意每日飲水量。\n\n• 淚痕：多與飲食或淚管阻塞有關，可記錄近期換食時間點交叉比對。\n• 建議：將鮭魚配方列入試用，觀察 7 天排泄與活力變化。\n\n⚠️ 以上為資訊整理，無法取代獸醫診斷。";

function Nutritionist() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const empty = messages.length === 0;

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = (content) => {
    if (!content.trim()) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: CANNED_REPLY }]);
      setLoading(false);
    }, 1100);
  };

  const suggestions = ["布丁 最近眼睛有淚痕，該怎麼辦？", "能幫我分析最近的症狀記錄嗎？", "推薦適合腎臟病的飲食調整方向"];

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#E2F3E4] flex items-center justify-center shrink-0"><Icon name="Stethoscope" size={24} className="text-[#2D6A4F]" strokeWidth={2.5} /></div>
        <div><h1 className="text-xl font-bold tracking-tight">AI 營養師</h1><p className="text-sm text-slate-500 font-medium">與毛孩專屬營養師對話</p></div>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#FEF1E2] border border-[#F3D9BE] rounded-2xl px-4 py-3 mb-6 flex items-center gap-2">
        <Icon name="Info" size={16} className="text-[#D98A53] shrink-0" />
        <p className="text-xs font-bold text-[#9A6233]">本功能提供資訊整理與觀察建議，不能替代獸醫診斷。</p>
      </div>

      {/* Pet selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-[#111111] text-white shadow-sm shrink-0"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">布</span>布丁</button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors shrink-0"><span className="w-5 h-5 rounded-full bg-[#D98A53] text-white flex items-center justify-center text-[10px]">B</span>Bella</button>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col gap-3 mb-4 min-h-[280px]">
        {empty && (
          <div className="flex flex-col items-center text-center py-6">
            <LogoSVG width={56} height={56} />
            <p className="font-bold text-slate-900 mt-4">和 AI 討論 布丁 的健康</p>
            <p className="text-sm text-slate-500 font-medium mt-1">描述症狀、詢問飲食建議，或生成觀察計畫</p>
            <div className="mt-5 w-full max-w-md space-y-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="block w-full text-left px-4 py-3 bg-white rounded-2xl border-2 border-slate-900/5 text-sm font-bold text-slate-600 hover:border-[#D98A53]/50 hover:text-[#D98A53] transition-colors shadow-sm">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <div className="mr-2 shrink-0 mt-0.5"><LogoSVG width={28} height={28} /></div>}
            <div className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-[#111111] text-white rounded-3xl rounded-tr-md font-medium" : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-3xl rounded-tl-md font-medium"}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="mr-2 shrink-0"><LogoSVG width={28} height={28} /></div>
            <div className="bg-white rounded-3xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-100">
              <div className="flex gap-1">{[0, 1, 2].map((i) => (<div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>))}</div>
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>

      {/* Composer — opaque bar pinned to bottom of the flex column (conversation is flex-1) */}
      <div className="mt-auto bg-white -mx-6 md:-mx-8 px-6 md:px-8 pt-3 pb-3 border-t border-slate-100">
        {empty && <button onClick={() => send("請根據布丁的狀況，幫我生成本週的健康觀察計畫，並給出改善建議。")} className="w-full mb-2 flex items-center justify-center gap-2 bg-[#FEF1E2] text-[#D98A53] rounded-full py-3 text-sm font-bold hover:bg-[#FCE7D2] transition-colors"><Icon name="Sparkles" size={16} strokeWidth={2.5} /> 生成本週觀察計畫</button>}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="詢問關於 布丁 的問題..." className="flex-1 bg-transparent px-4 py-2 text-sm font-medium outline-none placeholder:text-slate-400" />
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-black transition-colors"><Icon name="Mic" size={18} /></button>
          <button onClick={() => send(input)} disabled={!input.trim() || loading} className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center disabled:opacity-30 hover:bg-black transition-colors shrink-0"><Icon name="Send" size={18} /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 即時分析 (Scan) ---------------- */
const VERDICTS = {
  safe: { label: "適合", icon: "CheckCircle2", fill: "#E2F3E4", text: "#2D6A4F", border: "#B7E4C7" },
  caution: { label: "謹慎", icon: "AlertTriangle", fill: "#FEF1E2", text: "#9A6233", border: "#F3D9BE" },
  danger: { label: "不建議", icon: "XCircle", fill: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
};
const DEMO_RESULT = {
  verdict: "caution", score: 72, productName: "自然本色 鮭魚無穀配方", summary: "整體適合腎臟保健，但磷含量偏中等，建議控制份量並搭配飲水。",
  ingredients: ["鮭魚 40%", "馬鈴薯", "豌豆", "鮭魚油", "亞麻籽", "絲蘭萃取物", "蔓越莓", "金盞花"],
  concerns: [{ ing: "磷 0.8%", reason: "腎臟病犬建議選擇更低磷配方，請控制每日餵食量。" }],
  positives: [{ ing: "Omega-3 0.5%", reason: "有助皮膚與被毛健康，對淚痕亦有幫助。" }, { ing: "絲蘭萃取物", reason: "可降低糞便氣味、輔助腸道。" }],
};
const SCAN_HISTORY = [
  { verdict: "safe", score: 88, date: "3/1 16:17", title: "自然本色 亮白無穀鮭魚配方", summary: "此鮭魚無穀配方整體適合這隻比熊食用，鮭魚為主要蛋白質來源與目前固定飲食一致，Omega-3 有助改善淚痕，但需留意磷含量。" },
  { verdict: "caution", score: 72, date: "3/1 16:16", title: "火雞蔬果機能配方", summary: "整體成分優質，火雞雞肉蛋白來源良好，但部分成分（番茄、肉桂）可能輕微加重淚痕與口腔問題，需留意與現有鮭魚主食搭配。" },
];

function Scan({ navigate }) {
  const [open, setOpen] = useState(false);       // analysis modal
  const [stage, setStage] = useState("capture"); // capture | analyzing | result
  const v = VERDICTS[DEMO_RESULT.verdict];

  const startNew = () => { setStage("capture"); setOpen(true); };
  const analyze = () => { setStage("analyzing"); setTimeout(() => setStage("result"), 1400); };

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header: title + new-analysis button */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#FEF1E2] flex items-center justify-center text-[#D98A53] shrink-0"><Icon name="Camera" size={20} strokeWidth={2.2} /></div>
          <h1 className="text-xl font-bold tracking-tight truncate">即時分析</h1>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2.5 rounded-full text-sm font-bold hover:bg-black transition-colors shadow-lg shadow-black/10 shrink-0"><Icon name="Camera" size={16} strokeWidth={2.5} /> AI 即時分析</button>
      </div>

      {/* History list */}
      <div className="max-w-2xl mx-auto w-full">
        <p className="text-sm font-bold text-slate-400 mb-4 px-1">布丁 的分析紀錄</p>
        <div className="space-y-3">
          {SCAN_HISTORY.map((rec, i) => {
            const vv = VERDICTS[rec.verdict];
            return (
              <button key={i} onClick={startNew} className="w-full text-left bg-white border-2 border-slate-900/5 rounded-[24px] p-3.5 shadow-sm hover:shadow-md transition-shadow flex gap-3.5 items-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-slate-900/5" style={{ backgroundColor: vv.fill }}><Icon name="FileText" size={26} strokeWidth={2} style={{ color: vv.text }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: vv.fill, color: vv.text }}><Icon name={vv.icon} size={11} strokeWidth={2.5} /> {vv.label} {rec.score}%</span>
                    <span className="text-[10px] font-bold text-slate-400">{rec.date}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-snug line-clamp-2">{rec.summary}</p>
                </div>
                <Icon name="ChevronRight" size={16} className="text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
        {/* Empty-state hint when no records — kept for completeness */}
      </div>

      {/* ── Analysis modal (capture → analyzing → result) ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full md:max-w-md bg-white rounded-t-[32px] md:rounded-[32px] max-h-[88vh] overflow-y-auto hide-scrollbar animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-base flex items-center gap-2"><Icon name="Search" size={18} className="text-[#D98A53]" /> AI 成分即時分析</h2>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><Icon name="X" size={18} /></button>
            </div>
            <div className="p-5">
              {stage !== "result" ? (
                <>
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 h-52 flex flex-col items-center justify-center gap-2 mb-5">
                    {stage === "analyzing" ? (
                      <>
                        <div className="w-12 h-12 rounded-full border-4 border-[#D98A53] border-t-transparent animate-spin"></div>
                        <p className="text-sm font-bold text-slate-500 mt-2">AI 分析成分中…</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300"><Icon name="Camera" size={28} /></div>
                        <p className="text-sm font-bold text-slate-500">拍攝或上傳成分標籤照片</p>
                        <p className="text-[11px] font-medium text-slate-400">JPG / PNG / WebP，20MB 以內</p>
                      </>
                    )}
                  </div>
                  {stage === "capture" && (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"><Icon name="Camera" size={16} /> 拍照<input type="file" accept="image/*" capture="environment" className="hidden" /></label>
                        <label className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"><Icon name="Image" size={16} /> 從相簿選擇<input type="file" accept="image/*" className="hidden" /></label>
                      </div>
                      <button onClick={analyze} className="w-full bg-[#111111] text-white rounded-2xl py-4 font-bold text-sm hover:bg-black transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2"><Icon name="Search" size={16} strokeWidth={2.5} /> 開始 AI 分析</button>
                    </>
                  )}
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="rounded-3xl p-5 mb-4" style={{ backgroundColor: v.fill, border: `1px solid ${v.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={v.icon} size={22} strokeWidth={2.5} style={{ color: v.text }} />
                      <span className="text-base font-bold" style={{ color: v.text }}>{v.label}</span>
                      <span className="text-2xl font-bold ml-1" style={{ color: v.text }}>{DEMO_RESULT.score}%</span>
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: v.text }}>{DEMO_RESULT.productName}</p>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: v.text }}>{DEMO_RESULT.summary}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mb-2">識別到的成分</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">{DEMO_RESULT.ingredients.map((i) => (<span key={i} className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">{i}</span>))}</div>
                  <p className="text-xs font-bold text-[#B91C1C] mb-2 flex items-center gap-1"><Icon name="AlertTriangle" size={13} strokeWidth={2.5} /> 需留意</p>
                  <div className="space-y-2 mb-5">{DEMO_RESULT.concerns.map((c, i) => (<div key={i} className="bg-[#FEF2F2] border border-[#FCA5A5]/50 rounded-2xl px-3 py-2.5"><p className="text-xs font-bold text-slate-800">{c.ing}</p><p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">{c.reason}</p></div>))}</div>
                  <p className="text-xs font-bold text-[#2D6A4F] mb-2 flex items-center gap-1"><Icon name="CheckCircle2" size={13} strokeWidth={2.5} /> 有益成分</p>
                  <div className="space-y-2 mb-6">{DEMO_RESULT.positives.map((p, i) => (<div key={i} className="bg-[#E2F3E4]/60 border border-[#B7E4C7]/60 rounded-2xl px-3 py-2.5"><p className="text-xs font-bold text-slate-800">{p.ing}</p><p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">{p.reason}</p></div>))}</div>
                  <button className="w-full mb-2 flex items-center justify-center gap-2 bg-[#FEF1E2] text-[#D98A53] rounded-2xl py-3.5 text-sm font-bold hover:bg-[#FCE7D2] transition-colors"><Icon name="Plus" size={16} strokeWidth={2.5} /> 加入試用清單</button>
                  <button onClick={() => setOpen(false)} className="w-full bg-slate-100 text-slate-600 rounded-2xl py-3 text-sm font-bold hover:bg-slate-200 transition-colors">完成，返回紀錄列表</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 快訊 News (通知中心) ---------------- */
const NEWS_TYPES = {
  danger: { label: "食安警示", bg: "#FEF2F2", color: "#DC2626", icon: "AlertTriangle" },
  award: { label: "得獎好消息", bg: "#E2F3E4", color: "#2D6A4F", icon: "Award" },
  recall: { label: "食安公告", bg: "#FEF1E2", color: "#CA8A04", icon: "ShieldAlert" },
  knowledge: { label: "營養知識", bg: "#EDF3FB", color: "#475569", icon: "BookOpen" },
  promo: { label: "優惠活動", bg: "#FDE2EC", color: "#BE3D73", icon: "Tag" },
  system: { label: "系統通知", bg: "#F1F5F9", color: "#64748B", icon: "Bell" },
};
const NEWS_BRAND = [
  { type: "danger", used: true, title: "「自然本色」部分批次鮭魚配方啟動自主回收", source: "食品藥物管理署", time: "2 小時前", unread: true },
  { type: "award", used: true, title: "「毛孩關鍵 益生菌」榮獲 2026 台灣寵物保健金獎", source: "品牌新聞", time: "1 天前", unread: true },
  { type: "recall", used: true, title: "你常用的「純啖」雞胸肉塊通過 SGS 重金屬檢驗合格", source: "品牌公告", time: "3 天前", unread: false },
];
const NEWS_GENERAL = [
  { type: "recall", used: false, title: "農業部公告：市售進口飼料黴菌毒素抽驗結果出爐", source: "農業部", time: "3 天前", unread: false },
  { type: "knowledge", used: false, title: "老年犬腎臟保健：磷與鈣的攝取要點懶人包", source: "營養知識", time: "4 天前", unread: false },
  { type: "promo", used: false, title: "換食季限定：精選低敏無穀飼料 9 折優惠", source: "優惠活動", time: "5 天前", unread: false },
  { type: "system", used: false, title: "布丁 的年度疫苗接種剩 15 天，記得預約", source: "系統通知", time: "1 週前", unread: false },
];

function NewsCard({ n }) {
  const t = NEWS_TYPES[n.type];
  return (
    <button className="w-full text-left bg-white border-2 border-slate-900/5 rounded-[24px] p-4 flex gap-3.5 items-start shadow-sm hover:shadow-md transition-shadow relative">
      {n.unread && <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: t.bg }}><Icon name={t.icon} size={22} strokeWidth={2.2} style={{ color: t.color }} /></div>
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: t.bg, color: t.color }}>{t.label}</span>
          {n.used && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#111111] text-white">您的毛孩正在食用</span>}
        </div>
        <h4 className="font-bold text-slate-900 leading-snug">{n.title}</h4>
        <p className="text-[11px] font-bold text-slate-400 mt-1.5">{n.source} · {n.time}</p>
      </div>
    </button>
  );
}

function News() {
  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF1E2] flex items-center justify-center text-[#D98A53] shrink-0"><Icon name="Newspaper" size={24} strokeWidth={2.2} /></div>
        <div><h1 className="text-xl font-bold tracking-tight">快訊與通知</h1><p className="text-sm text-slate-500 font-medium">毛孩相關消息主動推播給你</p></div>
      </div>

      {/* 與毛孩相關（使用中產品廠商消息）*/}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-slate-900">與你的毛孩相關</h2>
        <span className="text-[11px] font-bold text-white bg-[#DC2626] rounded-full px-2 py-0.5">{NEWS_BRAND.filter((n) => n.unread).length} 則新訊息</span>
      </div>
      <p className="text-xs font-medium text-slate-400 mb-3">你正在使用的食品廠商,有得獎、食安等好壞消息時會主動通知。</p>
      <div className="space-y-3 mb-8">
        {NEWS_BRAND.map((n, i) => <NewsCard key={i} n={n} />)}
      </div>

      {/* 一般通知 */}
      <h2 className="text-base font-bold text-slate-900 mb-3">其他通知</h2>
      <div className="space-y-3">
        {NEWS_GENERAL.map((n, i) => <NewsCard key={i} n={n} />)}
      </div>
    </div>
  );
}

Object.assign(window, { Nutritionist, Scan, News });
