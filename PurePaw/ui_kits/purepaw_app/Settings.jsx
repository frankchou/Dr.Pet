/* PurePaw UI Kit — Settings / 設定與檔案. Faithful port of v2 Settings.tsx.
   Tabs: 毛孩檔案 (swipeable pet cards + add) · 紀錄參數設定 (toggle list). */

const { useState, useRef } = React;

function Settings({ navigate }) {
  const [tab, setTab] = useState("profile");
  const carouselRef = useRef(null);
  const scrollPets = (dir) => {
    const el = carouselRef.current; if (!el) return;
    const card = el.querySelector("[data-pet-card]");
    const stride = card ? card.offsetWidth + 24 : 624;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + dir * stride));
  };
  const [pets, setPets] = useState([
    { id: "1", name: "布丁", breed: "黃金獵犬", gender: "male_neutered", birthDate: "2023-04-15", weight: "32.5", chipNumber: "990000012345678", image: "https://images.unsplash.com/photo-1602241628512-459cdd3234fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080" },
    { id: "2", name: "Bella", breed: "米克斯", gender: "female_neutered", birthDate: "2022-08-10", weight: "12.0", chipNumber: "990000087654321", image: "" },
  ]);
  const [params, setParams] = useState([
    { id: "1", label: "日常飲食紀錄", enabled: true }, { id: "2", label: "用藥與看診", enabled: true },
    { id: "3", label: "洗澡美容", enabled: true }, { id: "4", label: "體重追蹤", enabled: false },
    { id: "5", label: "飲水量", enabled: false }, { id: "6", label: "活動量與散步", enabled: true },
    { id: "7", label: "嘔吐 / 毛球", enabled: true }, { id: "8", label: "排泄狀況", enabled: true },
    { id: "9", label: "睡眠品質", enabled: true }, { id: "10", label: "換食計畫追蹤", enabled: true },
    { id: "11", label: "異常症狀", enabled: true }, { id: "12", label: "備註與心情", enabled: false },
    { id: "13", label: "我的標籤", enabled: true },
  ]);
  const updatePet = (id, field, value) => setPets(pets.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  const addPet = () => setPets([...pets, { id: Date.now().toString(), name: "新毛孩", breed: "", gender: "male", birthDate: "", weight: "", chipNumber: "", image: "" }]);
  const toggleParam = (id) => setParams(params.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));

  const inputCls = "w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all";

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Header */}
      <div className="flex items-center justify-center mb-6 relative">
        <button onClick={() => navigate("/")} className="absolute left-0 w-10 h-10 flex items-center justify-start text-slate-700"><Icon name="ChevronLeft" size={24} strokeWidth={2.5} /></button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">設定與檔案</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-full mb-8">
        <button onClick={() => setTab("profile")} className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tab === "profile" ? "bg-[#111111] shadow-sm text-white" : "text-slate-500 hover:text-black"}`}>毛孩檔案</button>
        <button onClick={() => setTab("params")} className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tab === "params" ? "bg-[#111111] shadow-sm text-white" : "text-slate-500 hover:text-black"}`}>紀錄參數設定</button>
      </div>

      {tab === "profile" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={() => scrollPets(-1)} className="hidden md:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shrink-0"><Icon name="ChevronLeft" size={18} strokeWidth={2.5} /></button>
            <p className="text-sm font-bold text-slate-500 text-center"><span className="md:hidden">左右滑動以切換毛孩</span><span className="hidden md:inline">切換毛孩檔案</span></p>
            <button onClick={() => scrollPets(1)} className="hidden md:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shrink-0"><Icon name="ChevronRight" size={18} strokeWidth={2.5} /></button>
          </div>
          <div ref={carouselRef} className="flex overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8 pb-8 gap-6 hide-scrollbar">
            {pets.map((pet) => (
              <div key={pet.id} data-pet-card className="w-[calc(100vw-3rem)] md:w-[600px] shrink-0">
                <div className="flex flex-col items-center mb-8">
                  <div className="relative mb-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-sm bg-[#F5F1E8] flex items-center justify-center">
                      {pet.image ? <img src={pet.image} alt={pet.name} className="w-full h-full object-cover object-top" /> : <span className="text-[#D98A53] text-4xl font-bold">{pet.name.charAt(0)}</span>}
                    </div>
                    <button className="absolute bottom-0 right-0 w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center border-4 border-[#F4F7FB] shadow-sm hover:scale-105 transition-transform"><Icon name="Camera" size={16} /></button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50"><Icon name="Info" size={18} className="text-slate-400" /><h3 className="font-bold text-slate-800 text-sm">基本資訊</h3></div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">名字</label>
                        <input type="text" value={pet.name} onChange={(e) => updatePet(pet.id, "name", e.target.value)} className={inputCls} />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">品種</label>
                          <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="PawPrint" size={16} /></div>
                            <input type="text" value={pet.breed} onChange={(e) => updatePet(pet.id, "breed", e.target.value)} className={inputCls + " pl-10"} /></div>
                        </div>
                        <div className="w-[120px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">性別</label>
                          <select value={pet.gender} onChange={(e) => updatePet(pet.id, "gender", e.target.value)} className={inputCls + " appearance-none"}>
                            <option value="male">公</option><option value="female">母</option><option value="male_neutered">公 (已結紮)</option><option value="female_neutered">母 (已結紮)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50"><Icon name="Weight" size={18} className="text-slate-400" /><h3 className="font-bold text-slate-800 text-sm">生理與晶片</h3></div>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">生日</label>
                          <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="Calendar" size={16} /></div>
                            <input type="date" value={pet.birthDate} onChange={(e) => updatePet(pet.id, "birthDate", e.target.value)} className={inputCls + " pl-10"} /></div>
                        </div>
                        <div className="w-[120px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">體重 (kg)</label>
                          <input type="number" step="0.1" value={pet.weight} onChange={(e) => updatePet(pet.id, "weight", e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">晶片號碼</label>
                        <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="Hash" size={16} /></div>
                          <input type="text" value={pet.chipNumber} onChange={(e) => updatePet(pet.id, "chipNumber", e.target.value)} placeholder="輸入 15 碼晶片編號" className={inputCls + " pl-10"} /></div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4"><button className="w-full bg-[#111111] text-white font-bold rounded-2xl py-4 hover:bg-black transition-colors shadow-lg shadow-black/10">儲存檔案</button></div>
                </div>
              </div>
            ))}
            <div className="w-[calc(100vw-3rem)] md:w-[600px] shrink-0 flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <button onClick={addPet} className="flex flex-col items-center gap-3 text-slate-400 hover:text-slate-600 transition-colors">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center"><Icon name="Plus" size={32} /></div>
                <span className="font-bold">新增毛孩檔案</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "params" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6"><p className="text-sm font-bold text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">點選以隱藏或顯示以下項目。<br />按下並拖曳項目以調整日誌表單中的順序。</p></div>
          <div className="flex-1 bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {params.map((param, i) => (
              <div key={param.id} className={`flex items-center justify-between p-4 ${i !== params.length - 1 ? "border-b border-slate-50" : ""}`}>
                <span className="text-sm font-bold text-slate-800">{param.label}</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleParam(param.id)} className={`w-[48px] h-7 rounded-full relative transition-colors duration-300 ${param.enabled ? "bg-[#111111]" : "bg-slate-200"}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${param.enabled ? "translate-x-5" : "translate-x-0"}`}></div>
                  </button>
                  <div className="text-slate-300 cursor-grab hover:text-slate-500 transition-colors"><Icon name="Menu" size={18} strokeWidth={2.5} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Login — faithful port of v2 Login.tsx (Google-only, split apricot/white) */
function Login({ navigate }) {
  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col md:flex-row overflow-hidden" style={{ fontFamily: "var(--pp-font)" }}>
      <div className="md:w-5/12 lg:w-1/2 flex-none bg-[#FFE8D6] p-8 md:p-12 lg:p-20 flex flex-col items-center justify-center relative min-h-[40vh] md:min-h-screen">
        <div className="absolute top-6 left-6 flex items-center gap-2 md:hidden">
          <LogoSVG width="36" height="36" />
          <div className="flex flex-col justify-center leading-tight"><span className="font-bold tracking-tight text-lg text-[#111111]">PurePaw</span><span className="font-bold tracking-widest text-[10px] text-slate-700">無敏毛孩</span></div>
        </div>
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center">
          <HandDrawnGraphic />
          <h2 className="hidden md:block text-2xl font-bold text-[#111111] mt-8 mb-3 text-center">專屬台灣毛孩的<br />AI 健康管理神器</h2>
          <div className="hidden md:flex flex-col gap-2 items-center text-slate-800 font-bold text-sm">
            <span className="flex items-center gap-1.5 bg-white/40 px-4 py-1.5 rounded-full"><Icon name="CheckCircle2" size={16} className="text-[#D98A53]" /> 日常飲食與排泄輕鬆記</span>
            <span className="flex items-center gap-1.5 bg-white/40 px-4 py-1.5 rounded-full"><Icon name="CheckCircle2" size={16} className="text-[#D98A53]" /> 24H AI 營養師專業諮詢</span>
          </div>
        </div>
      </div>
      <div className="md:w-7/12 lg:w-1/2 flex-1 bg-white rounded-t-[40px] md:rounded-l-[40px] md:rounded-tr-none flex flex-col justify-center px-8 py-10 md:px-16 lg:px-24 -mt-8 md:mt-0 relative z-10" style={{ boxShadow: "0 -20px 40px -15px rgba(0,0,0,0.05)" }}>
        <div className="w-full max-w-md mx-auto">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <LogoSVG width="48" height="48" />
            <div className="flex flex-col justify-center leading-tight"><span className="font-bold tracking-tight text-2xl text-[#111111]">PurePaw</span><span className="font-bold tracking-widest text-sm text-slate-500">無敏毛孩</span></div>
          </div>
          <div className="mb-12">
            <h1 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2 flex items-center gap-2">歡迎回來 <Icon name="Sparkles" size={24} className="text-[#FDE047]" fill="#FDE047" /></h1>
            <p className="text-slate-500 font-bold text-sm md:text-base">使用 Google 快速登入或註冊，今天也為毛孩記錄健康吧！</p>
          </div>
          <div className="space-y-4">
            <button onClick={() => navigate("/")} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-2xl py-4 hover:bg-slate-50 hover:border-slate-200 transition-all text-base font-bold text-slate-700 shadow-sm">
              <svg viewBox="0 0 24 24" width="24" height="24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              使用 Google 繼續
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandDrawnGraphic() {
  return (
    <svg viewBox="0 0 200 200" className="w-[260px] h-[260px] md:w-[360px] md:h-[360px] max-w-full drop-shadow-sm">
      <circle cx="100" cy="100" r="75" fill="#FFFFFF" />
      <path d="M70,140 Q40,110 60,70 Q80,30 130,50 Q170,70 160,120 Q150,170 100,160 Q80,155 70,140" fill="#F4F7FB" />
      <circle cx="140" cy="55" r="24" fill="#FCA5A5" className="opacity-60" />
      <circle cx="55" cy="135" r="18" fill="#FDE047" className="opacity-80" />
      <circle cx="165" cy="140" r="12" fill="#7C9CE3" className="opacity-70" />
      <g fill="none" stroke="#111111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M65,75 C60,45 85,55 90,65" /><path d="M135,75 C140,45 115,55 110,65" />
        <path d="M65,75 Q45,115 75,135 Q100,145 125,135 Q155,115 135,75 Q100,65 65,75" />
        <path d="M85,100 Q90,95 95,100" /><path d="M115,100 Q110,95 105,100" />
        <path d="M100,115 L98,112 L102,112 Z" fill="#111111" /><path d="M100,115 Q100,122 93,125" /><path d="M100,115 Q100,122 107,125" />
        <path d="M80,150 L120,150 L115,165 L85,165 Z" fill="#FFFFFF" /><path d="M100,150 L100,158" />
      </g>
      <g fill="none" stroke="#111111" strokeWidth="2.5" strokeLinecap="round">
        <path d="M30,45 L40,45 M35,40 L35,50" /><path d="M170,100 L180,100 M175,95 L175,105" /><path d="M45,170 L50,170 M47.5,167.5 L47.5,172.5" />
      </g>
    </svg>
  );
}

Object.assign(window, { Settings, Login });
