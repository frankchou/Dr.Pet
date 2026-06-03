/* PurePaw UI Kit — app entry. State router + first-login legal modal. */

const { useState, useRef, useEffect } = React;

const DISC_KEY = "purepaw_disclaimer_ack_v1";

function DisclaimerModal({ onAgree }) {
  const [atBottom, setAtBottom] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    const el = bodyRef.current; if (!el) return;
    // if content fits without scrolling, enable immediately
    if (el.scrollHeight - el.clientHeight < 16) setAtBottom(true);
  }, []);

  const onScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setAtBottom(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" style={{ fontFamily: "var(--pp-font)" }}>
      <div className="w-full md:max-w-lg bg-white rounded-t-[32px] md:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <LogoSVG width={36} height={36} />
          <div>
            <h2 className="font-bold text-lg text-[#111111]">使用前重要聲明</h2>
            <p className="text-xs font-bold text-slate-400">請詳閱以下內容並滑動至最下方</p>
          </div>
        </div>

        <div ref={bodyRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm font-medium text-slate-600 leading-relaxed">
          <Clause n="1" t="服務性質">PurePaw 無敏毛孩（以下簡稱「本服務」）所提供之寵物營養分析、成分判讀、換食與補充建議，均由 AI 系統根據您提供的資料自動生成，屬於資訊整理與衛教參考。</Clause>
          <Clause n="2" t="非醫療診斷"><span className="font-bold text-[#111111]">本服務不構成、也無法取代專業獸醫師的醫療診斷、治療或處方。</span>任何健康疑慮、疾病處置與用藥決定，均應以您的獸醫師臨床判斷為準。</Clause>
          <Clause n="3" t="資訊正確性">AI 分析結果可能因資料不完整、產品標示差異或模型限制而有誤差。本服務不保證所有資訊之即時性、完整性與正確性，內容僅供參考。</Clause>
          <Clause n="4" t="個人化限制">每隻毛孩的年齡、品種、病史與體質皆不同。系統提供之建議為一般性參考，實際餵食份量、保健品與處方請務必與獸醫師討論後再行調整。</Clause>
          <Clause n="5" t="緊急狀況">若您的毛孩出現嘔吐、拒食、呼吸困難、中毒或其他急性症狀，請立即就醫，切勿僅依賴本服務之建議延誤治療。</Clause>
          <Clause n="6" t="資料與隱私">您所輸入的毛孩資料僅用於產生分析結果與改善服務體驗，我們將依個資相關法規妥善保管。</Clause>
          <Clause n="7" t="同意條款">點選「我已閱讀並同意」即表示您已充分理解上述內容，並同意在知悉前述限制的前提下使用本服務。</Clause>
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">資料參考來源：世界動物衛生組織、WSAVA、AAFCO、FEDIAF、NRC、農業部動植物防疫檢疫署、台灣小動物獸醫學會、國立臺灣大學獸醫專業學院等。</p>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}>
          {!atBottom && <p className="text-[11px] font-bold text-slate-400 text-center mb-2 flex items-center justify-center gap-1"><Icon name="ChevronDown" size={13} /> 請滑動閱讀至最下方以繼續</p>}
          <button onClick={onAgree} disabled={!atBottom}
            className={`w-full rounded-2xl py-4 font-bold text-sm transition-all ${atBottom ? "bg-[#111111] text-white hover:bg-black shadow-lg shadow-black/10" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}>
            我已閱讀並同意
          </button>
        </div>
      </div>
    </div>
  );
}

function Clause({ n, t, children }) {
  return (
    <div>
      <h3 className="font-bold text-[#111111] mb-1 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#FFE8D6] text-[#D98A53] text-[11px] flex items-center justify-center shrink-0">{n}</span>{t}</h3>
      <p className="pl-7">{children}</p>
    </div>
  );
}

function App() {
  const [route, setRoute] = useState("/login");
  const [dietJump, setDietJump] = useState(0);
  const [showDisc, setShowDisc] = useState(false);

  const navigate = (to, hash) => {
    if (to === "/diary" && hash === "#diet-record") setDietJump((n) => n + 1);
    if (to !== "/login" && !localStorage.getItem(DISC_KEY)) setShowDisc(true);
    setRoute(to);
    const main = document.getElementById("main-scroll-container");
    if (main) main.scrollTop = 0;
  };

  const agreeDisc = () => { try { localStorage.setItem(DISC_KEY, "1"); } catch (e) {} setShowDisc(false); };
  const onCamera = () => navigate("/scan");

  if (route === "/login") return <Login navigate={navigate} />;

  let screen = null;
  if (route === "/") screen = <Home navigate={navigate} />;
  else if (route === "/diary") screen = <Diary navigate={navigate} jumpDiet={dietJump} />;
  else if (route === "/settings") screen = <Settings navigate={navigate} />;
  else if (route === "/nutritionist") screen = <Nutritionist navigate={navigate} />;
  else if (route === "/news") screen = <News navigate={navigate} />;
  else if (route === "/scan") screen = <Scan navigate={navigate} />;

  return (
    <>
      <Layout route={route} navigate={navigate} onCamera={onCamera}>{screen}</Layout>
      {showDisc && <DisclaimerModal onAgree={agreeDisc} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
