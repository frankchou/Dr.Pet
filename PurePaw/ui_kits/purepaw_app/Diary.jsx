/* PurePaw UI Kit — Diary / 日誌. Faithful port of v2 Diary.tsx.
   Diet-plan banner · month/week calendar · AI memo · quick records
   (medication, grooming, diet record w/ full product nutrition). */

const { useState, useEffect, useRef } = React;

function Diary({ navigate, jumpDiet }) {
  const [aiText, setAiText] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [tab, setTab] = useState("month");
  const [grooming, setGrooming] = useState("home");
  const [wash, setWash] = useState({ all: false, wash: true, nails: false, ears: true, glands: false, shaveBottom: false, shaveAll: false });
  const [meal, setMeal] = useState("breakfast");
  const [query, setQuery] = useState("自然本色");
  const [filter, setFilter] = useState("全部商品");
  const [open, setOpen] = useState(false);
  const [hasPlan, setHasPlan] = useState(false); // 是否已啟動換食計畫 → 切換頂部橫幅
  const dietRef = useRef(null);
  const filters = ["全部商品", "飼料", "保健品", "花椰菜"];
  const danger = query.includes("巧克力");

  useEffect(() => {
    if (jumpDiet && dietRef.current) {
      const t = setTimeout(() => {
        dietRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [jumpDiet]);

  const toggleWash = (key) => {
    if (key === "all") {
      const v = !wash.all;
      setWash({ all: v, wash: v, nails: v, ears: v, glands: v, shaveBottom: v, shaveAll: v });
    } else setWash((p) => ({ ...p, [key]: !p[key], all: false }));
  };
  const analyze = () => { if (aiText.trim()) setShowAi(true); };

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <Icon name="ChevronLeft" size={20} className="text-black" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">日誌</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* (換食計畫橫幅已移至「日常飲食紀錄」區塊內) */}


      {/* Calendar toggle */}
      <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
        <button onClick={() => setTab("month")} className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tab === "month" ? "bg-[#111111] shadow-sm text-white" : "text-slate-500 hover:text-black"}`}>月曆頁面</button>
        <button onClick={() => setTab("week")} className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tab === "week" ? "bg-[#111111] shadow-sm text-white" : "text-slate-500 hover:text-black"}`}>週曆頁面</button>
      </div>

      {/* Week */}
      {tab === "week" && (
        <div className="flex justify-between items-center mb-8 bg-white border-2 border-slate-900/5 rounded-3xl p-4 shadow-sm relative overflow-hidden">
          {["一", "二", "三", "四", "五", "六", "日"].map((d, i) => {
            const today = d === "四", rec = i === 1 || i === 5;
            return (
              <div key={i} className="flex flex-col items-center gap-2 relative z-10">
                <span className="text-xs font-bold text-slate-400">{d}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${today ? "bg-[#111111] text-white shadow-md" : "text-slate-700 hover:bg-slate-50"}`}>{14 + i}</div>
                {rec && <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#7C9CE3]"></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Month */}
      {tab === "month" && (
        <div className="mb-8 bg-white border-2 border-slate-900/5 rounded-[32px] p-5 md:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FEF1E2] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="flex justify-between items-center mb-6 px-2 relative z-10">
            <button className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors"><Icon name="ChevronLeft" size={20} /></button>
            <h3 className="font-bold text-xl text-slate-900">2026年 6月</h3>
            <button className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors"><Icon name="ChevronRight" size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-y-4 gap-x-2 relative z-10">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => (<div key={d} className="text-center text-[11px] font-bold text-slate-400 mb-2">{d}</div>))}
            <div className="h-10"></div>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
              const today = d === 17, rec = [5, 8, 15, 25].includes(d);
              return (
                <div key={d} className="flex flex-col items-center justify-start h-12 relative cursor-pointer group">
                  <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all ${today ? "bg-[#111111] text-white shadow-md" : "text-slate-700 group-hover:bg-slate-50"}`}>{d}</div>
                  <div className="flex gap-0.5 mt-1">{rec && <div className="w-1.5 h-1.5 rounded-full bg-[#7C9CE3]"></div>}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI memo */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">AI 隨記：</h2>
        <div className="relative">
          <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} onBlur={analyze}
            placeholder="輸入今日生活、飲食、異狀... (可語音和打字輸入)"
            className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 min-h-[120px] text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400"></textarea>
          <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-500 hover:text-black hover:bg-slate-100 transition-colors"><Icon name="Mic" size={18} /></button>
        </div>
        {showAi && (
          <div className="mt-4 bg-[#111111] text-white p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <Icon name="CheckCircle2" size={20} className="text-[#A7F3D0] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium leading-relaxed">語意解析後提示：</p>
              <p className="text-sm font-bold">「已為您自動勾選：吐毛球、拒食。是否正確？」</p>
              <div className="flex gap-2 mt-3">
                <button className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full">正確</button>
                <button className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-full" onClick={() => setShowAi(false)}>重新辨識</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold mb-4">快速紀錄 <span className="text-sm text-slate-400 font-medium">(偶發事件，點擊由底部彈出)</span></h2>

      {/* Medication */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <Icon name="Pill" size={20} className="text-[#D98A53]" /><h3 className="font-bold text-lg">用藥與看診</h3>
        </div>
        <div className="mb-5">
          <p className="text-sm font-bold text-slate-500 mb-2">歷史標籤：</p>
          <button className="bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-4 py-2 rounded-full border border-slate-200">點吃驅蟲藥：新疥爽</button>
          <p className="text-[10px] text-slate-400 mt-1 ml-2">*(點擊自動帶入紀錄那天)</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500 mb-3">新增紀錄：</p>
          <div className="space-y-3">
            {[{ l: "預防針與疫苗", p: "輸入/選擇疫苗名稱" }, { l: "點吃驅蟲用藥", p: "輸入/選擇驅蟲藥品牌" }, { l: "服用處方藥物", p: "輸入處方藥名稱" }, { l: "醫院門診檢查", p: "輸入看診醫院/項目" }].map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 text-sm font-bold text-slate-700 shrink-0">{it.l}</span>
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-slate-200 transition-all">
                  <div className="bg-slate-100 w-10 h-10 flex items-center justify-center border-r border-slate-200 text-slate-500 shrink-0"><Icon name="Plus" size={16} /></div>
                  <input type="text" placeholder={it.p} className="w-full bg-transparent p-3 text-sm outline-none placeholder:text-slate-400 font-medium" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-bold text-slate-500">附加功能：</span>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200"><Icon name="Camera" size={14} /> 拍藥袋/收據</button>
            <button className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200"><Icon name="Clock" size={14} /> 下次提醒設定</button>
          </div>
        </div>
      </div>

      {/* Grooming */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <Icon name="Scissors" size={20} className="text-[#F391B3]" /><h3 className="font-bold text-lg">洗澡美容</h3>
        </div>
        <div className="mb-4">
          <p className="text-sm font-bold text-slate-500 mb-3">模式選擇 (單選)：</p>
          <div className="flex gap-4">
            {[{ k: "home", l: "居家自洗" }, { k: "shop", l: "基礎小美容(送洗)" }].map((m) => (
              <button key={m.k} onClick={() => setGrooming(m.k)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${grooming === m.k ? "text-black" : "text-slate-400"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${grooming === m.k ? "bg-black border-black text-white" : "border-slate-300"}`}>{grooming === m.k && <Icon name="Check" size={12} strokeWidth={3} />}</div>
                {m.l}
              </button>
            ))}
          </div>
        </div>
        {grooming === "home" && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3">(展開多選)</p>
            <div className="flex flex-wrap gap-x-4 gap-y-3">
              {[{ k: "all", l: "全選" }, { k: "wash", l: "洗澡" }, { k: "nails", l: "剪甲" }, { k: "ears", l: "清耳" }, { k: "glands", l: "擠肛門腺" }, { k: "shaveBottom", l: "剃腳底毛" }, { k: "shaveAll", l: "全身剪" }].map((it) => {
                const c = wash[it.k];
                return (
                  <button key={it.k} onClick={() => toggleWash(it.k)} className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${c ? "bg-black border-black text-white" : "bg-white border-slate-300"}`}>{c && <Icon name="Check" size={12} strokeWidth={3} />}</div>
                    {it.l}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Diet record */}
      <div ref={dietRef} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8 scroll-mt-24">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <Icon name="Package" size={20} className="text-[#7C9CE3]" /><h3 className="font-bold text-lg">日常飲食紀錄</h3>
        </div>

        {/* 換食計畫 — 依使用者狀態切換 */}
        <PlanBanner hasPlan={hasPlan} setHasPlan={setHasPlan} />

        <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
          {[{ k: "breakfast", l: "早餐" }, { k: "lunch", l: "中餐" }, { k: "dinner", l: "晚餐" }].map((m) => (
            <button key={m.k} onClick={() => setMeal(m.k)} className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${meal === m.k ? "bg-white shadow-sm text-black" : "text-slate-500 hover:text-black"}`}>{m.l}</button>
          ))}
        </div>
        <div className="relative mb-6">
          <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋食物名稱..." className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all font-bold placeholder:text-slate-400" />
          <Icon name="Mic" size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black cursor-pointer transition-colors" />
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((f) => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? "bg-[#111111] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{f}</button>))}
        </div>

        {danger ? (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-4 flex gap-3 shadow-sm">
            <div className="mt-0.5"><Icon name="AlertTriangle" size={20} className="text-[#DC2626]" strokeWidth={2.5} /></div>
            <div>
              <h3 className="text-[#991B1B] font-bold text-base mb-1">危險警告：巧克力</h3>
              <p className="text-[#B91C1C] text-xs font-medium leading-relaxed">巧克力對寵物具有劇毒。若誤食可能導致嚴重後果，請立即諮詢獸醫！</p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex gap-2 mb-2">
                  <span className="bg-[#E2F3E4] text-[#2D6A4F] px-2 py-0.5 rounded-full text-[10px] font-bold">狗乾飼料</span>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">已加入</span>
                </div>
                <h3 className="font-bold text-lg mb-1 text-slate-900 leading-tight">自然本色小型犬<br />亮白無穀鮭魚配方</h3>
                <p className="text-xs font-bold text-slate-400">規格：1.5kg</p>
              </div>
              <button className="w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-md"><Icon name="Plus" size={20} strokeWidth={2.5} /></button>
            </div>
            <div className="mt-4 border border-slate-200 rounded-xl bg-white overflow-hidden">
              <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2"><Icon name="FileText" size={16} className="text-slate-600" /><span className="text-sm font-bold text-slate-800">成分與營養資訊</span></div>
                <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} className="text-slate-400" />
              </button>
              <div className={`px-4 pb-4 ${open ? "block" : "hidden"}`}>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">鮭魚(40%)、馬鈴薯、紅薯、家禽脂肪、豌豆、甜菜漿、鮭魚油、磷酸二鈣、動態微粉化斜發沸石(1%)、亞麻籽、木薯、低聚果糖(FOS)、絲蘭萃取物、綠茶、蔓越莓乾、金盞花(葉黃素的來源)。</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["ISO 22000", "AAFCO", "FEDIAF"].map((c) => (<span key={c} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-700"><Icon name="CheckCircle" size={12} /> {c}</span>))}
                </div>

                {/* 營養添加物 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2"><Icon name="FlaskConical" size={14} className="text-slate-600" /><h4 className="font-bold text-slate-800 text-xs">營養添加物 (每公斤)</h4></div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">維生素A(3a672a) 18000 IU, 維生素D3(3a671) 1500 IU, 維生素E(3a700) 530mg, 葉酸(3a316) 1mg, 生物素(3a8880) 0.1mg, 菸鹼酸(3a314) 35mg, 維生素B6(3a831) 3mg, 維生素B1 3mg, 維生素B12 0.05 µg, 一水硫酸亞鐵(3b103) 50mg, 無水碘酸鈣(3b202) 1.5mg, 五水合硫酸銅(3b405) 5mg, 一水硫酸錳(3b503) 20mg, 一水硫酸鋅(3b605) 115mg, 亞硒酸鈉(3b801) 0.1mg。技術添加：迷迭香提取物，從植物油中萃取的生育酚(1b306(i))。</p>
                </div>

                {/* 營養成分表 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3"><Icon name="BarChart3" size={14} className="text-slate-600" /><h4 className="font-bold text-slate-800 text-xs">營養成分表</h4></div>
                  <div className="grid grid-cols-2 gap-y-2 mb-3">
                    {[["蛋白質", "25%"], ["脂肪", "15%"], ["粗灰分", "9.5%"], ["粗纖維", "3.5%"], ["鈣", "1.5%"], ["磷", "0.8%"], ["鉀", "0.6%"], ["鈉", "0.4%"], ["Omega3", "0.50%"], ["Omega6", "2.62%"]].map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-[10px]"><div className="w-1 h-1 rounded-full bg-slate-300"></div><span className="text-slate-600">{k} <span className="font-bold text-slate-900 ml-1">{v}</span></span></div>
                    ))}
                  </div>
                  <div className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">熱量：3515千卡/公斤</div>
                </div>

                {/* 商品規格 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3"><Icon name="Package" size={14} className="text-slate-600" /><h4 className="font-bold text-slate-800 text-xs">商品規格</h4></div>
                  <div className="grid grid-cols-2 gap-y-2">
                    {[["適用年齡", "成齡"], ["產地", "立陶宛"], ["功能", "淚痕"], ["穀類", "無穀"], ["口味", "魚肉"], ["軟硬度", "稍硬"], ["顆粒大小", "小顆粒"]].map(([k, v]) => (
                      <div key={k} className="text-[10px]"><span className="text-slate-500">{k}：</span><span className="font-bold text-slate-900 ml-1">{v}</span></div>
                    ))}
                  </div>
                </div>

                {/* 製造與代理資訊 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3"><Icon name="Factory" size={14} className="text-slate-600" /><h4 className="font-bold text-slate-800 text-xs">製造與代理資訊</h4></div>
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-500 mb-1">製造與產地</h5>
                      <div className="space-y-1 text-[10px] text-slate-700">
                        <p>生產國別：立陶宛 (Lithuania)</p>
                        <p>製造商：UAB AKVATERA</p>
                        <p className="leading-relaxed">製造商地址：Medelyno street 20, Dievogalos village, Kaunas district, Lithuania</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-500 mb-1">代理商資訊</h5>
                      <div className="space-y-1 text-[10px] text-slate-700">
                        <p>進口代理：三奇國際貿易有限公司</p>
                        <p>服務電話：02-8286-9983</p>
                        <p>通訊地址：新北市蘆洲區集賢路318號18樓</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 每日建議餵食量 */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3"><Icon name="Calendar" size={14} className="text-slate-600" /><h4 className="font-bold text-slate-800 text-xs">每日建議餵食量</h4></div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[10px] text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold"><tr><th className="px-3 py-2">體重 (kg)</th><th className="px-3 py-2">每日餵食 (g)</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                        {[["1-2公斤", "31-53克/日"], ["2-3公斤", "53-72克/日"], ["3-4公斤", "72-89克/日"], ["4-5公斤", "89-105克/日"], ["5-6公斤", "105-121克/日"], ["6-7公斤", "121-135克/日"], ["7-8公斤", "135-150克/日"], ["8-9公斤", "150-163克/日"], ["9-10公斤", "163-177克/日"]].map(([w, g]) => (
                          <tr key={w}><td className="px-3 py-1.5">{w}</td><td className="px-3 py-1.5">{g}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-start">
                    <button className="text-[10px] font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors flex items-center gap-1"><Icon name="AlertTriangle" size={12} /> 錯誤回報</button>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-3">
                  <div className="flex gap-2 flex-wrap"><span>AI 驗證出處：</span><a href="#" className="underline hover:text-slate-600">寵物食品申報網</a><a href="#" className="underline hover:text-slate-600">自然本色官網</a></div>
                  <div className="bg-slate-50 px-2 py-1 rounded inline-flex items-center gap-1 text-slate-500 self-start"><Icon name="CheckCircle" size={10} /> 數據更新: 2024-05-20</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 使用中產品 — v1 固定/試用清單整併 */}
      <ProductLists />

      {/* 換食計畫啟動後：追蹤天數 + AI 替代產品推薦（v1 整併）*/}
      {hasPlan && <DietPlanActive onEnd={() => setHasPlan(false)} />}
    </div>
  );
}

const TYPE_META = {
  feed: { label: "飼料", char: "飼", bg: "#FEF1E2" },
  can: { label: "罐頭", char: "罐", bg: "#FDE2EC" },
  snack: { label: "零食", char: "零", bg: "#EDF3FB" },
  supplement: { label: "保健品", char: "保", bg: "#EAF5ED" },
  dental: { label: "牙膏牙粉", char: "潔", bg: "#E2F3E4" },
};
const PRODUCTS = {
  fixed: [
    { type: "feed", name: "自然本色 亮白無穀鮭魚配方", brand: "自然本色 · 1.5kg" },
    { type: "supplement", name: "毛孩關鍵 益生菌保健粉", brand: "PetWell · 30 包" },
  ],
  trial: [
    { type: "snack", name: "冷凍乾燥 純雞胸肉塊", brand: "純啖 · 50g" },
  ],
};

function ProductLists() {
  const [tab, setTab] = useState("fixed");
  const list = PRODUCTS[tab];
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
        <Icon name="Box" size={20} className="text-[#D98A53]" />
        <h3 className="font-bold text-lg">使用中產品</h3>
      </div>
      <div className="flex bg-slate-100 p-1.5 rounded-full mb-5">
        <button onClick={() => setTab("fixed")} className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tab === "fixed" ? "bg-[#111111] shadow-sm text-white" : "text-slate-500 hover:text-black"}`}>固定</button>
        <button onClick={() => setTab("trial")} className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tab === "trial" ? "bg-[#111111] shadow-sm text-white" : "text-slate-500 hover:text-black"}`}>試用</button>
      </div>
      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-8 text-sm font-bold text-slate-400">尚無{tab === "fixed" ? "固定" : "試用"}產品</div>
        ) : list.map((p, i) => {
          const m = TYPE_META[p.type];
          return (
            <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 hover:bg-slate-100/70 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-[#D98A53] font-bold text-base" style={{ backgroundColor: m.bg }}>{m.char}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-slate-400">{m.label} · {p.brand}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${tab === "fixed" ? "bg-[#FEF1E2] text-[#D98A53]" : "bg-[#E2F3E4] text-[#2D6A4F]"}`}>{tab === "fixed" ? "固定" : "試用"}</span>
              <Icon name="ChevronRight" size={16} className="text-slate-300 shrink-0" />
            </div>
          );
        })}
        <button className="w-full mt-1 flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-2xl py-3 text-sm font-bold text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
          <Icon name="Plus" size={16} strokeWidth={2.5} /> 新增{tab === "fixed" ? "固定" : "試用"}產品
        </button>
      </div>
    </div>
  );
}

function PlanBanner({ hasPlan, setHasPlan }) {
  if (hasPlan) return null; // 啟動後改由「使用中產品」下方的 DietPlanActive 呈現
  return (
    <button onClick={() => setHasPlan(true)} className="w-full text-left bg-[#111111] rounded-2xl p-5 mb-6 flex items-center justify-between gap-3 group hover:bg-black transition-colors shadow-lg shadow-black/10 relative overflow-hidden">
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none"><Icon name="Sparkles" size={88} /></div>
      <div className="relative z-10 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="Sparkles" size={18} className="text-[#F391B3]" strokeWidth={2.5} />
          <h3 className="text-white font-bold text-base">AI 換食計劃</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">目前的飲食計畫是最佳的嗎？讓 AI 根據毛孩現況為您客製化推薦</p>
      </div>
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 relative z-10 group-hover:bg-white group-hover:text-black transition-all"><Icon name="ChevronRight" size={18} /></div>
    </button>
  );
}

function DietPlanActive({ onEnd }) {
  return (
    <div className="mt-2 space-y-4">
      {/* 換食進度追蹤 + 結束計劃 */}
      <div className="bg-[#E2F3E4] rounded-2xl p-4 border border-[#B7E4C7] shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white shrink-0"><Icon name="Calendar" size={16} /></div>
        <div className="flex-1">
          <h3 className="text-[#2D6A4F] font-bold text-sm">換食計畫進行中</h3>
          <p className="text-[#1B4332] font-bold">換食進度： 第 4 天</p>
        </div>
        <button onClick={onEnd} className="text-xs font-bold text-[#2D6A4F] border border-[#2D6A4F]/30 rounded-full px-3 py-1.5 hover:bg-[#2D6A4F]/10 transition-colors shrink-0">結束計劃</button>
      </div>

      {/* AI 產品替代推薦 */}
      <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1"><Icon name="ShoppingCart" size={20} className="text-[#D98A53]" /><h3 className="font-bold text-lg">AI 產品替代推薦</h3></div>
        <p className="text-sm font-medium text-slate-400 mb-4">根據風險成分與寵物健康狀況，推薦具體的替代產品</p>
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-[#CA8A04] mb-1.5 flex items-center gap-1"><Icon name="AlertTriangle" size={13} strokeWidth={2.5} /> 警示成分 — 建議替換</p>
          <p className="font-bold text-slate-900 mb-2">自然本色鮭魚</p>
          <p className="text-xs font-bold text-slate-400">問題成分： <span className="bg-[#FEF9C3] text-[#854D0E] px-2 py-0.5 rounded-full">粗灰分</span></p>
        </div>
        <p className="text-xs font-bold text-slate-400 mb-3">推薦替代產品</p>
        <div className="space-y-3">
          <RecCardD name="Canidae 純淨系列 鮭魚單一蛋白無穀狗糧（CANIDAE PURE Salmon）"
            desc="採用精簡配方，粗灰分含量相對較低且成分透明，以單一動物蛋白為主，可降低礦物質堆積風險，並添加益生菌與益生元，有助消化道與淚痕問題改善。"
            pros={["單一蛋白來源（鮭魚），成分精簡易追溯", "含益生菌（Lactobacillus），支持消化道健康", "無穀物配方，減少植物性填充物導致灰分偏高", "Omega-3 脂肪酸豐富，有助眼周發炎與淚痕管理"]}
            avoid={["確認所購批次標示粗灰分低於 8%（乾物質基礎建議值）", "避免選購添加大量魚粉副產品（fish by-product meal）的批次，應以全魚為第一原料"]}
            tip="可於台灣各大寵物連鎖店（特力屋寵物、PCHOME / momo 寵物頻道）搜尋「Canidae PURE 鮭魚」找到代理商現貨。" />
          <RecCardD name="Orijen 單一蛋白系列 太平洋鮭魚狗糧（Orijen Singles Pacific Salmon）"
            desc="採用 90% 動物性原料且以新鮮全魚為主，粗灰分來源較單純可控，高品質動物蛋白亦有助於口腔健康、消化穩定性，以及因 Omega-3 攝取充足而減輕淚痕發炎。"
            pros={["90% 動物性原料，新鮮鮭魚列為第一原料，灰分來源清晰", "富含天然 Omega-3（EPA＋DHA），有助緩解眼周及皮膚發炎", "不添加人工防腐劑、色素與穀物", "高蛋白低碳水化合物配比，支持消化道菌相平衡"]}
            avoid={["Orijen 粗灰分約 8-9%，對腎臟功能異常犬隻需謹慎，建議先確認此犬腎指數正常", "首次轉換應採 7-10 天漸進式換糧，避免消化敏感犬隻產生腸胃不適"]}
            tip="可搜尋「Orijen Singles 鮭魚 狗糧」，於康是美寵物區、寵物公園、或官方台灣總代理網站均可購得。" />
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
          <span className="text-[11px] font-bold text-slate-400">2/28 上午09:26</span>
          <button className="text-sm font-bold text-[#D98A53] hover:underline">重新取得建議</button>
        </div>
      </div>
    </div>
  );
}

function RecCardD({ name, desc, pros, avoid, tip }) {
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

Object.assign(window, { Diary });
