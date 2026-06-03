import { Search, ArrowUpRight, Plus, Sparkles, User, Calendar, Droplets, Cake, Activity } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const LineFillIcon = ({ name, size = 26, className = "" }) => {
  const baseProps = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: "2",
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    className
  };
  
  if (name === "bone") return (
    <svg {...baseProps}>
      <path d="M17 10c.7-.7 1.4-1 2-1a3 3 0 010 6c-.6 0-1.3-.3-2-1v0c-.7.7-1.4 1-2 1a3 3 0 010-6c.6 0 1.3.3 2 1z" />
      <path d="M7 10c-.7-.7-1.4-1-2-1a3 3 0 000 6c.6 0 1.3-.3 2-1v0c.7.7 1.4 1 2 1a3 3 0 000-6c-.6 0-1.3.3-2 1z" />
      <path d="M7 12h10" />
      <path d="M17 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" stroke="none" />
    </svg>
  );
  if (name === "medbox") return (
    <svg {...baseProps}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3" />
      <path d="M11 11h2v6h-2z" fill="currentColor" stroke="none" />
      <path d="M9 13h6v2H9z" fill="currentColor" stroke="none" />
    </svg>
  );
  if (name === "pill") return (
    <svg {...baseProps}>
      <g transform="rotate(-45 12 12)">
        <rect x="4" y="8" width="16" height="8" rx="4" />
        <path d="M12 8 h4 a4 4 0 0 1 4 4 v0 a4 4 0 0 1 -4 4 h-4 z" fill="currentColor" stroke="none" />
        <rect x="4" y="8" width="16" height="8" rx="4" />
      </g>
    </svg>
  );
  if (name === "syringe") return (
    <svg {...baseProps}>
      <path d="M18 2l4 4 M14 6l4 4 M18 8l-8 8-4-4 8-8Z M10 16l-3 3-4-1-1-4 3-3 M14 10l2 2 M12 12l2 2 M10 14l2 2" />
      <path d="M2.5 21.5 C2 21 2 20 3 19 L4.5 17.5 L6.5 19.5 L5 21 C4 22 3 22 2.5 21.5 Z" fill="currentColor" stroke="none" />
    </svg>
  );
  if (name === "parasite") return (
    <svg {...baseProps}>
      <circle cx="10" cy="10" r="7" />
      <path d="M15 15l6 6" strokeWidth="2.5" />
      <circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none" />
      <path d="M6 10h8 M8 7l4 6 M8 13l4-6" />
    </svg>
  );
  if (name === "stethoscope") return (
    <svg {...baseProps}>
      <path d="M4 3v4c0 4.4 3.6 8 8 8s8-3.6 8-8V3" />
      <path d="M12 15v6 M9 21h6" />
      <circle cx="2" cy="3" r="2" fill="currentColor" stroke="none" />
      <circle cx="22" cy="3" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="21" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
  
  return null;
};

const CustomIconContainer = ({ name, bgColor }) => (
  <div 
    className="w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm border border-slate-900/5 text-[#111111]"
    style={{ backgroundColor: bgColor }}
  >
    <LineFillIcon name={name} />
  </div>
);

export function Home() {
  return (
    <div className="px-6 md:px-8 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2 md:pt-4">
      
      {/* Pet Profile Header (Full Bleed) */}
      <div className="relative -mx-6 md:-mx-8 -mt-28 md:-mt-4 mb-8 h-[650px] md:h-[700px] overflow-hidden flex flex-col justify-end md:rounded-t-[24px]">
        {/* Full Cover Background Image */}
        <div className="absolute inset-0 z-0">
          <ImageWithFallback src="https://images.unsplash.com/photo-1602241628512-459cdd3234fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjByZXRyaWV2ZXIlMjBkb2clMjBmYWNlfGVufDF8fHx8MTc4MDI5MzM4MHww&ixlib=rb-4.1.0&q=80&w=1080" alt="布丁" className="w-full h-full object-cover object-top scale-125 origin-top" />
          {/* Gradient to blend into the gray-blue background of the dashboard */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#F4F7FB] via-[#F4F7FB]/80 to-transparent"></div>
        </div>
        
        {/* Overlay Content */}
        <div className="relative z-10 flex flex-col items-center pb-6 md:pb-10 px-4">
          <div className="w-fit flex flex-col items-start">
            <h1 className="text-2xl md:text-3xl font-black mb-3 text-[#3A332C] tracking-widest drop-shadow-sm">布丁</h1>
            <div className="flex flex-wrap gap-3">
              <span className="bg-[#FAF8F5]/80 backdrop-blur-md px-5 py-2 rounded-full text-sm font-bold text-[#3A332C] shadow-sm border border-white/40">黃金獵犬</span>
              <span className="bg-[#FAF8F5]/80 backdrop-blur-md px-5 py-2 rounded-full text-sm font-bold text-[#3A332C] shadow-sm border border-white/40">♂ 已結紮</span>
              <span className="bg-[#FAF8F5]/80 backdrop-blur-md px-5 py-2 rounded-full text-sm font-bold text-[#3A332C] shadow-sm border border-white/40">3歲2個月</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Grid for Desktop / Stacked for Mobile */}
      <div className="flex flex-col lg:flex-row gap-8 pb-8">
        
        {/* LEFT COLUMN: Health & Analysis */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Health Overview Title */}
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
                <Activity size={16} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">健康檔案概覽</h2>
            </div>
          </div>

          {/* Health Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {/* Card 1 - Diet */}
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 relative overflow-hidden shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <CustomIconContainer name="bone" bgColor="#FEF1E2" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">飲食需知</h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">雞肉</span>
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">鴨肉</span>
                  <span className="bg-[#D98A53] text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm">
                    <Sparkles size={10} strokeWidth={3} /> 蜂膠
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2 - Disease */}
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 relative overflow-hidden shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <CustomIconContainer name="medbox" bgColor="#FDE2EC" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">確診疾病</h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">腎臟病</span>
                </div>
              </div>
            </div>

            {/* Card 3 - Symptoms */}
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 relative overflow-hidden shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <CustomIconContainer name="pill" bgColor="#EAF5ED" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">日常症狀</h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">舔咬左腳</span>
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">淚腺</span>
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">牙結石</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Analysis & Add New Meal Title */}
          <h2 className="text-xl font-bold tracking-tight mb-4">快速功能</h2>
          
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 lg:mb-0">
            {/* Soft Orange Card */}
            <div className="bg-[#FEF1E2] rounded-[32px] p-6 md:p-8 relative overflow-hidden flex-1 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-4 right-4 md:top-8 md:right-8 text-[#D98A53] opacity-30">
                <Sparkles size={64} className="md:w-24 md:h-24" />
              </div>
              <h3 className="font-black text-xl md:text-2xl mb-2 relative z-10 text-slate-900">毛孩成長分析</h3>
              <p className="text-sm text-slate-700 font-medium mb-6 relative z-10 w-4/5 md:w-3/4">
                一歲以下的幼貓幼犬，建議提供高蛋白質的配方。
              </p>
              <div className="flex flex-wrap items-center gap-2 relative z-10">
                <span className="bg-white/70 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 backdrop-blur-md shadow-sm border border-white/50">已記錄 2 餐</span>
                <span className="bg-white/70 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 backdrop-blur-md shadow-sm border border-white/50">目標達成 85%</span>
              </div>
            </div>

            {/* Black Call to action card */}
            <div className="flex-1">
              <Link to="/diary#diet-record" className="block bg-[#111111] rounded-[32px] md:rounded-[32px] rounded-full p-4 md:p-8 flex md:flex-col items-center md:items-start justify-between md:justify-center group hover:bg-black transition-colors h-full shadow-lg shadow-black/10">
                
                {/* Mobile Layout (Row) */}
                <div className="flex items-center gap-4 md:hidden">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black">
                    <Plus size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">飲食紀錄</h4>
                    <p className="text-slate-400 text-xs font-medium">記錄今天的食物或換食</p>
                  </div>
                </div>
                
                {/* Desktop Layout (Column) */}
                <div className="hidden md:flex items-center justify-between w-full mb-6">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
                    <Plus size={24} strokeWidth={3} />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <div className="hidden md:block">
                  <h4 className="text-white font-black text-2xl mb-1">飲食紀錄</h4>
                  <p className="text-slate-400 text-sm font-medium">記錄今天的食物或換食</p>
                </div>

                {/* Mobile Arrow */}
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white mr-2 md:hidden group-hover:bg-white group-hover:text-black transition-all">
                  <ArrowUpRight size={18} />
                </div>

              </Link>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Schedules */}
        <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col">
          
          {/* Important Schedule */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-8 lg:mb-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-700">
                <Sparkles size={16} />
              </div>
              <h3 className="font-bold text-slate-800">重要日程</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#D98A53]/50 transition-colors cursor-pointer bg-white">
                <Calendar size={24} strokeWidth={2.5} className="text-[#111111] mb-2" />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1">年度疫苗</span>
                <span className="text-sm font-black text-[#D98A53]">剩 15 天</span>
              </div>
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#5C946E]/50 transition-colors cursor-pointer bg-white">
                <Droplets size={24} strokeWidth={2.5} className="text-[#111111] mb-2" />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1">體外驅蟲</span>
                <span className="text-sm font-black text-slate-400 group-hover:text-[#5C946E] transition-colors">剩 24 天</span>
              </div>
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#F391B3]/50 transition-colors cursor-pointer bg-white">
                <Cake size={24} strokeWidth={2.5} className="text-[#111111] mb-2" />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1">生日</span>
                <span className="text-sm font-black text-slate-700">09-12</span>
              </div>
            </div>
          </div>

          {/* Future Schedule Title */}
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
                <Calendar size={16} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">未來日程表</h2>
            </div>
          </div>

          {/* Future Schedule Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
            <button className="flex-1 py-2 rounded-full text-sm font-bold bg-[#111111] text-white shadow-sm transition-all">
              醫療
            </button>
            <button className="flex-1 py-2 rounded-full text-sm font-bold text-slate-500 hover:text-black transition-all">
              美容
            </button>
            <button className="flex-1 py-2 rounded-full text-sm font-bold text-slate-500 hover:text-black transition-all">
              節日
            </button>
          </div>

          {/* Medical Schedule List */}
          <div className="space-y-4">
            
            {/* Item 1 */}
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <CustomIconContainer name="syringe" bgColor="#FEF1E2" />
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 mb-1">核心疫苗補打</h4>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#D98A53]">
                      <ArrowUpRight size={14} strokeWidth={3} /> 每年一次接種
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xl text-[#D98A53]">剩 15 天</div>
                  <div className="text-[10px] font-bold text-slate-400">2025-12-15</div>
                </div>
              </div>
              <div className="border-t-2 border-slate-100 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Calendar size={14} strokeWidth={2.5} /> 上次紀錄
                </div>
                <div className="text-xs font-bold text-slate-700">2024-11-08</div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <CustomIconContainer name="parasite" bgColor="#EAF5ED" />
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 mb-1">心介爽 (防蟲)</h4>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <Calendar size={14} strokeWidth={2.5} /> 每兩個月一次
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xl text-[#5C946E]">剩 24 天</div>
                  <div className="text-[10px] font-bold text-slate-400">2025-12-24</div>
                </div>
              </div>
              <div className="border-t-2 border-slate-100 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Calendar size={14} strokeWidth={2.5} /> 上次紀錄
                </div>
                <div className="text-xs font-bold text-slate-700">2024-11-08</div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}