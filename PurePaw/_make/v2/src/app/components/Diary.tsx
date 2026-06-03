import { useState, useEffect } from "react";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Mic, CheckCircle2, 
  Pill, Scissors, Plus, Camera, Clock, Check, Search, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, FileText, FlaskConical, BarChart3, Package, Factory, Calendar, Sparkles
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";

export function Diary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [aiText, setAiText] = useState("");
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<'month' | 'week'>('month');
  const [groomingMode, setGroomingMode] = useState<'home' | 'shop'>('home');
  const [homeWashItems, setHomeWashItems] = useState({
    all: false, wash: true, nails: false, ears: true, glands: false, shaveBottom: false, shaveAll: false
  });
  
  // Diet Record State
  const [activeMeal, setActiveMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [searchQuery, setSearchQuery] = useState('自然本色');
  const [activeFilter, setActiveFilter] = useState('全部商品');
  const [isDietExpanded, setIsDietExpanded] = useState(false);
  const filters = ['全部商品', '飼料', '保健品', '花椰菜'];
  const isDanger = searchQuery.includes('巧克力');

  useEffect(() => {
    if (location.hash === '#diet-record') {
      setTimeout(() => {
        const element = document.getElementById('diet-record');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100); // small delay to ensure rendering is complete
    }
  }, [location]);

  const handleAiAnalyze = () => {
    if (aiText.trim()) {
      setShowAiAnalysis(true);
    }
  };

  useEffect(() => {
    if (location.hash === '#diet-record') {
      setTimeout(() => {
        const element = document.getElementById('diet-record');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location.hash]);

  const toggleHomeWash = (key: keyof typeof homeWashItems) => {
    if (key === 'all') {
      const newVal = !homeWashItems.all;
      setHomeWashItems({
        all: newVal, wash: newVal, nails: newVal, ears: newVal, 
        glands: newVal, shaveBottom: newVal, shaveAll: newVal
      });
    } else {
      setHomeWashItems(prev => ({ ...prev, [key]: !prev[key], all: false }));
    }
  };

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={20} className="text-black" />
        </button>
        <h1 className="text-xl font-black tracking-tight">日誌</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Diet Plan Banner */}
      <div className="bg-[#E2F3E4] rounded-2xl p-4 mb-8 border border-[#B7E4C7] shadow-sm flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white shrink-0">
          <CalendarIcon size={16} />
        </div>
        <div>
          <h3 className="text-[#2D6A4F] font-bold text-sm">動態橫幅 (有啟動換食計畫才顯示)</h3>
          <p className="text-[#1B4332] font-black">換食進度： 第 4 天</p>
        </div>
      </div>

      {/* Calendar Toggle */}
      <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
        <button 
          onClick={() => setActiveTab('month')}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'month' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black'}`}
        >
          月曆頁面
        </button>
        <button 
          onClick={() => setActiveTab('week')}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'week' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black'}`}
        >
          週曆頁面
        </button>
      </div>

      {/* Week Calendar */}
      {activeTab === 'week' && (
        <div className="flex justify-between items-center mb-8 bg-white border-2 border-slate-900/5 rounded-3xl p-4 shadow-sm relative overflow-hidden">
          {['一', '二', '三', '四', '五', '六', '日'].map((day, idx) => {
            const isToday = day === '四';
            const hasRecord = idx === 1 || idx === 5;
            return (
              <div key={idx} className="flex flex-col items-center gap-2 relative z-10">
                <span className="text-xs font-bold text-slate-400">{day}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${isToday ? 'bg-[#111111] text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
                  {14 + idx}
                </div>
                {/* Event Dot */}
                {hasRecord && <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#7C9CE3]"></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Month Calendar */}
      {activeTab === 'month' && (
        <div className="mb-8 bg-white border-2 border-slate-900/5 rounded-[32px] p-5 md:p-6 shadow-sm relative overflow-hidden">
          {/* Decorative background blob */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FEF1E2] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-6 px-2 relative z-10">
            <button className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors"><ChevronLeft size={20} /></button>
            <h3 className="font-black text-xl text-slate-900">2026年 6月</h3>
            <button className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors"><ChevronRight size={20} /></button>
          </div>
          
          <div className="grid grid-cols-7 gap-y-4 gap-x-2 relative z-10">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-slate-400 mb-2">{d}</div>
            ))}
            
            {/* Blank days for 1st of month (Monday start offset if needed, assuming Monday is 1st for June 2026) */}
            <div className="h-10"></div>
            
            {Array.from({length: 30}, (_, i) => i + 1).map(d => {
              const isToday = d === 17;
              const hasRecord = d === 5 || d === 8 || d === 15 || d === 25;
              
              return (
                <div key={d} className="flex flex-col items-center justify-start h-12 relative cursor-pointer group">
                  <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isToday ? 'bg-[#111111] text-white shadow-md' : 
                    'text-slate-700 group-hover:bg-slate-50'
                  }`}>
                    {d}
                  </div>
                  
                  {/* Event Dots Container */}
                  <div className="flex gap-0.5 mt-1">
                    {hasRecord && <div className="w-1.5 h-1.5 rounded-full bg-[#7C9CE3]"></div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Diary */}
      <div className="mb-8">
        <h2 className="text-lg font-black mb-3">AI 隨記：</h2>
        <div className="relative">
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onBlur={handleAiAnalyze}
            placeholder="輸入今日生活、飲食、異狀... (可語音和打字輸入)"
            className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 min-h-[120px] text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400"
          ></textarea>
          <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-500 hover:text-black hover:bg-slate-100 transition-colors">
            <Mic size={18} />
          </button>
        </div>

        {showAiAnalysis && (
          <div className="mt-4 bg-[#111111] text-white p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={20} className="text-[#A7F3D0] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium leading-relaxed">語意解析後提示：</p>
              <p className="text-sm font-bold">「已為您自動勾選：吐毛球、拒食。是否正確？」</p>
              <div className="flex gap-2 mt-3">
                <button className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full">正確</button>
                <button className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-full" onClick={() => setShowAiAnalysis(false)}>重新辨識</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-lg font-black mb-4">快速紀錄 <span className="text-sm text-slate-400 font-medium">(偶發事件，點擊由底部彈出)</span></h2>

      {/* Quick Record: Medication */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <Pill size={20} className="text-[#D98A53]" />
          <h3 className="font-black text-lg">[用藥與看診]</h3>
        </div>
        
        <div className="mb-5">
          <p className="text-sm font-bold text-slate-500 mb-2">歷史標籤：</p>
          <button className="bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-4 py-2 rounded-full border border-slate-200">
            點吃驅蟲藥：新疥爽
          </button>
          <p className="text-[10px] text-slate-400 mt-1 ml-2">*(點擊自動帶入紀錄那天)</p>
        </div>

        <div>
          <p className="text-sm font-bold text-slate-500 mb-3">新增紀錄：</p>
          <div className="space-y-3">
            {[
              { label: '預防針與疫苗', placeholder: '輸入/選擇疫苗名稱' },
              { label: '點吃驅蟲用藥', placeholder: '輸入/選擇驅蟲藥品牌' },
              { label: '服用處方藥物', placeholder: '輸入處方藥名稱' },
              { label: '醫院門診檢查', placeholder: '輸入看診醫院/項目' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-24 text-sm font-bold text-slate-700 shrink-0">{item.label}</span>
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-slate-200 transition-all">
                  <div className="bg-slate-100 w-10 h-10 flex items-center justify-center border-r border-slate-200 text-slate-500 shrink-0">
                    <Plus size={16} />
                  </div>
                  <input type="text" placeholder={item.placeholder} className="w-full bg-transparent p-3 text-sm outline-none placeholder:text-slate-400 font-medium" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4">
          <span className="text-sm font-bold text-slate-500">附加功能：</span>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200">
              <Camera size={14} /> 拍藥袋/收據
            </button>
            <button className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200">
              <Clock size={14} /> 下次提醒設定
            </button>
          </div>
        </div>
      </div>

      {/* Quick Record: Grooming */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <Scissors size={20} className="text-[#F391B3]" />
          <h3 className="font-black text-lg">[洗澡美容]</h3>
        </div>

        <div className="mb-4">
          <p className="text-sm font-bold text-slate-500 mb-3">模式選擇 (單選)：</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setGroomingMode('home')}
              className={`flex items-center gap-2 text-sm font-bold transition-colors ${groomingMode === 'home' ? 'text-black' : 'text-slate-400'}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${groomingMode === 'home' ? 'bg-black border-black text-white' : 'border-slate-300'}`}>
                {groomingMode === 'home' && <Check size={12} strokeWidth={3} />}
              </div>
              居家自洗
            </button>
            <button 
              onClick={() => setGroomingMode('shop')}
              className={`flex items-center gap-2 text-sm font-bold transition-colors ${groomingMode === 'shop' ? 'text-black' : 'text-slate-400'}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${groomingMode === 'shop' ? 'bg-black border-black text-white' : 'border-slate-300'}`}>
                {groomingMode === 'shop' && <Check size={12} strokeWidth={3} />}
              </div>
              基礎小美容(送洗)
            </button>
          </div>
        </div>

        {groomingMode === 'home' && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3">(展開多選)</p>
            <div className="flex flex-wrap gap-x-4 gap-y-3">
              {[
                { key: 'all', label: '全選' },
                { key: 'wash', label: '洗澡' },
                { key: 'nails', label: '剪甲' },
                { key: 'ears', label: '清耳' },
                { key: 'glands', label: '擠肛門腺' },
                { key: 'shaveBottom', label: '剃腳底毛' },
                { key: 'shaveAll', label: '全身剪' },
              ].map((item) => {
                const isChecked = homeWashItems[item.key as keyof typeof homeWashItems];
                return (
                  <button 
                    key={item.key}
                    onClick={() => toggleHomeWash(item.key as keyof typeof homeWashItems)}
                    className="flex items-center gap-1.5 text-sm font-bold text-slate-700"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${isChecked ? 'bg-black border-black text-white' : 'bg-white border-slate-300'}`}>
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Record: Diet Record */}
      <div id="diet-record" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8 scroll-mt-24">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <Package size={20} className="text-[#7C9CE3]" />
          <h3 className="font-black text-lg">[日常飲食紀錄]</h3>
        </div>

        {/* Meal Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
          <button 
            onClick={() => setActiveMeal('breakfast')}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeMeal === 'breakfast' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black'}`}
          >
            早餐
          </button>
          <button 
            onClick={() => setActiveMeal('lunch')}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeMeal === 'lunch' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black'}`}
          >
            中餐
          </button>
          <button 
            onClick={() => setActiveMeal('dinner')}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeMeal === 'dinner' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black'}`}
          >
            晚餐
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋食物名稱..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all font-bold placeholder:text-slate-400"
          />
          <Mic className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black cursor-pointer transition-colors" size={18} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeFilter === filter 
                  ? 'bg-[#111111] text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search Results */}
        {isDanger ? (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-4 flex gap-3 shadow-sm">
            <div className="mt-0.5">
              <AlertTriangle size={20} className="text-[#DC2626]" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[#991B1B] font-black text-base mb-1">危險警告：巧克力</h3>
              <p className="text-[#B91C1C] text-xs font-medium leading-relaxed">
                巧克力對寵物具有劇毒。若誤食可能導致嚴重後果，請立即諮詢獸醫！
              </p>
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
                <h3 className="font-black text-lg mb-1 text-slate-900 leading-tight">自然本色小型犬<br/>亮白無穀鮭魚配方</h3>
                <p className="text-xs font-bold text-slate-400">規格：1.5kg</p>
              </div>
              <button className="w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-md">
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Accordion / Expanded Area */}
            <div className="mt-4 border border-slate-200 rounded-xl bg-white overflow-hidden">
              <button 
                onClick={() => setIsDietExpanded(!isDietExpanded)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-600" />
                  <span className="text-sm font-bold text-slate-800">成分與營養資訊</span>
                </div>
                {isDietExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              
              <div className={`px-4 pb-4 transition-all duration-300 ${isDietExpanded ? 'block' : 'hidden'}`}>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
                  鮭魚(40%)、馬鈴薯、紅薯、家禽脂肪、豌豆、甜菜漿、鮭魚油、磷酸二鈣、動態微粉化斜發沸石(1%)、亞麻籽、木薯、低聚果糖(FOS)、絲蘭萃取物、綠茶、蔓越莓乾、金盞花(葉黃素的來源)。
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-700">
                    <CheckCircle size={12} /> ISO 22000
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-700">
                    <CheckCircle size={12} /> AAFCO
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-700">
                    <CheckCircle size={12} /> FEDIAF
                  </span>
                </div>

                {/* Nutritional Additives */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical size={14} className="text-slate-600" />
                    <h4 className="font-bold text-slate-800 text-xs">營養添加物 (每公斤)</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    維生素A(3a672a) 18000 IU, 維生素D3(3a671) 1500 IU, 維生素E(3a700) 530mg, 葉酸(3a316) 1mg, 生物素(3a8880) 0.1mg, 菸鹼酸(3a314) 35mg, 維生素B6(3a831) 3mg, 維生素B1 3mg, 維生素B12 0.05 µg, 一水硫酸亞鐵(3b103) 50mg, 無水碘酸鈣(3b202) 1.5mg, 五水合硫酸銅(3b405) 5mg, 一水硫酸錳(3b503) 20mg, 一水硫酸鋅(3b605) 115mg, 亞硒酸鈉(3b801) 0.1mg。技術添加：迷迭香提取物，從植物油中萃取的生育酚(1b306(i))。
                  </p>
                </div>

                {/* Nutritional Facts */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={14} className="text-slate-600" />
                    <h4 className="font-bold text-slate-800 text-xs">營養成分表</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 mb-3">
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">蛋白質 <span className="font-bold text-slate-900 ml-1">25%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">脂肪 <span className="font-bold text-slate-900 ml-1">15%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">粗灰分 <span className="font-bold text-slate-900 ml-1">9.5%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">粗纖維 <span className="font-bold text-slate-900 ml-1">3.5%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">鈣 <span className="font-bold text-slate-900 ml-1">1.5%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">磷 <span className="font-bold text-slate-900 ml-1">0.8%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">鉀 <span className="font-bold text-slate-900 ml-1">0.6%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">鈉 <span className="font-bold text-slate-900 ml-1">0.4%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">Omega3 <span className="font-bold text-slate-900 ml-1">0.50%</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="text-slate-600">Omega6 <span className="font-bold text-slate-900 ml-1">2.62%</span></span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">
                    熱量：3515千卡/公斤
                  </div>
                </div>

                {/* Specs */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={14} className="text-slate-600" />
                    <h4 className="font-bold text-slate-800 text-xs">商品規格</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="text-[10px]"><span className="text-slate-500">適用年齡：</span><span className="font-bold text-slate-900 ml-1">成齡</span></div>
                    <div className="text-[10px]"><span className="text-slate-500">產地：</span><span className="font-bold text-slate-900 ml-1">立陶宛</span></div>
                    <div className="text-[10px]"><span className="text-slate-500">功能：</span><span className="font-bold text-slate-900 ml-1">淚痕</span></div>
                    <div className="text-[10px]"><span className="text-slate-500">穀類：</span><span className="font-bold text-slate-900 ml-1">無穀</span></div>
                    <div className="text-[10px]"><span className="text-slate-500">口味：</span><span className="font-bold text-slate-900 ml-1">魚肉</span></div>
                    <div className="text-[10px]"><span className="text-slate-500">軟硬度：</span><span className="font-bold text-slate-900 ml-1">稍硬</span></div>
                    <div className="text-[10px]"><span className="text-slate-500">顆粒大小：</span><span className="font-bold text-slate-900 ml-1">小顆粒</span></div>
                  </div>
                </div>

                {/* Manufacturer Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Factory size={14} className="text-slate-600" />
                    <h4 className="font-bold text-slate-800 text-xs">製造與代理資訊</h4>
                  </div>
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

                {/* Feeding Guide */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={14} className="text-slate-600" />
                    <h4 className="font-bold text-slate-800 text-xs">每日建議餵食量</h4>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[10px] text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold">
                        <tr>
                          <th className="px-3 py-2">體重 (kg)</th>
                          <th className="px-3 py-2">每日餵食 (g)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                        <tr><td className="px-3 py-1.5">1-2公斤</td><td className="px-3 py-1.5">31-53克/日</td></tr>
                        <tr><td className="px-3 py-1.5">2-3公斤</td><td className="px-3 py-1.5">53-72克/日</td></tr>
                        <tr><td className="px-3 py-1.5">3-4公斤</td><td className="px-3 py-1.5">72-89克/日</td></tr>
                        <tr><td className="px-3 py-1.5">4-5公斤</td><td className="px-3 py-1.5">89-105克/日</td></tr>
                        <tr><td className="px-3 py-1.5">5-6公斤</td><td className="px-3 py-1.5">105-121克/日</td></tr>
                        <tr><td className="px-3 py-1.5">6-7公斤</td><td className="px-3 py-1.5">121-135克/日</td></tr>
                        <tr><td className="px-3 py-1.5">7-8公斤</td><td className="px-3 py-1.5">135-150克/日</td></tr>
                        <tr><td className="px-3 py-1.5">8-9公斤</td><td className="px-3 py-1.5">150-163克/日</td></tr>
                        <tr><td className="px-3 py-1.5">9-10公斤</td><td className="px-3 py-1.5">163-177克/日</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-start">
                    <button className="text-[10px] font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors flex items-center gap-1">
                      <AlertTriangle size={12} /> 錯誤回報
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-3">
                  <div className="flex gap-2">
                    <span>AI 驗證出處：</span>
                    <a href="#" className="underline hover:text-slate-600">寵物食品申報網</a>
                    <a href="#" className="underline hover:text-slate-600">自然本色官網</a>
                  </div>
                  <div className="bg-slate-50 px-2 py-1 rounded inline-flex items-center gap-1 text-slate-500 self-start">
                    <CheckCircle size={10} /> 數據更新: 2024-05-20
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
