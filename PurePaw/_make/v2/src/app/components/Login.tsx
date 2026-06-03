import { useNavigate } from "react-router";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { LogoSVG } from "./Logo";

// Korean Minimalist Hand-drawn Pet Graphic
const HandDrawnGraphic = () => (
  <svg viewBox="0 0 200 200" className="w-[280px] h-[280px] md:w-[360px] md:h-[360px] max-w-full drop-shadow-sm">
    {/* Pastel Background Elements */}
    <circle cx="100" cy="100" r="75" fill="#FFFFFF" />
    <path d="M70,140 Q40,110 60,70 Q80,30 130,50 Q170,70 160,120 Q150,170 100,160 Q80,155 70,140" fill="#F4F7FB" />
    <circle cx="140" cy="55" r="24" fill="#FCA5A5" className="opacity-60" />
    <circle cx="55" cy="135" r="18" fill="#FDE047" className="opacity-80" />
    <circle cx="165" cy="140" r="12" fill="#7C9CE3" className="opacity-70" />
    
    {/* Hand-drawn style lines */}
    <g fill="none" stroke="#111111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Dog Head */}
      <path d="M65,75 C60,45 85,55 90,65" />
      <path d="M135,75 C140,45 115,55 110,65" />
      <path d="M65,75 Q45,115 75,135 Q100,145 125,135 Q155,115 135,75 Q100,65 65,75" />
      
      {/* Eyes (sleepy/smiling) */}
      <path d="M85,100 Q90,95 95,100" />
      <path d="M115,100 Q110,95 105,100" />
      
      {/* Nose */}
      <path d="M100,115 L98,112 L102,112 Z" fill="#111111" />
      <path d="M100,115 Q100,122 93,125" />
      <path d="M100,115 Q100,122 107,125" />

      {/* Bowl */}
      <path d="M80,150 L120,150 L115,165 L85,165 Z" fill="#FFFFFF" />
      <path d="M100,150 L100,158" />
    </g>

    {/* Sparkles */}
    <g fill="none" stroke="#111111" strokeWidth="2.5" strokeLinecap="round">
      <path d="M30,45 L40,45 M35,40 L35,50" />
      <path d="M170,100 L180,100 M175,95 L175,105" />
      <path d="M45,170 L50,170 M47.5,167.5 L47.5,172.5" />
    </g>
  </svg>
);

export function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left/Top Illustration Section */}
      <div className="md:w-5/12 lg:w-1/2 flex-none bg-[#FFE8D6] p-8 md:p-12 lg:p-20 flex flex-col items-center justify-center relative min-h-[40vh] md:min-h-screen">
        <div className="absolute top-6 left-6 flex items-center gap-2 md:hidden">
          <LogoSVG width="36" height="36" />
          <div className="flex flex-col justify-center leading-tight">
            <span className="font-black tracking-tight text-lg text-[#111111]">PurePaw</span>
            <span className="font-bold tracking-widest text-[10px] text-slate-700">無敏毛孩</span>
          </div>
        </div>
        
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <HandDrawnGraphic />
          <h2 className="hidden md:block text-2xl font-black text-[#111111] mt-8 mb-3 text-center">
            專屬台灣毛孩的<br/>AI 健康管理神器
          </h2>
          <div className="hidden md:flex flex-col gap-2 items-center text-slate-800 font-bold text-sm">
            <span className="flex items-center gap-1.5 bg-white/40 px-4 py-1.5 rounded-full"><CheckCircle2 size={16} className="text-[#D98A53]" /> 日常飲食與排泄輕鬆記</span>
            <span className="flex items-center gap-1.5 bg-white/40 px-4 py-1.5 rounded-full"><CheckCircle2 size={16} className="text-[#D98A53]" /> 24H AI 營養師專業諮詢</span>
          </div>
        </div>
      </div>
      
      {/* Right/Bottom Form Section */}
      <div className="md:w-7/12 lg:w-1/2 flex-1 bg-white rounded-t-[40px] md:rounded-l-[40px] md:rounded-tr-none flex flex-col justify-center px-8 py-10 md:px-16 lg:px-24 -mt-8 md:mt-0 relative z-10 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] md:shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom-12 duration-500 delay-150">
        
        <div className="w-full max-w-md mx-auto">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <LogoSVG width="48" height="48" />
            <div className="flex flex-col justify-center leading-tight">
              <span className="font-black tracking-tight text-2xl text-[#111111]">PurePaw</span>
              <span className="font-bold tracking-widest text-sm text-slate-500">無敏毛孩</span>
            </div>
          </div>

          <div className="mb-12">
            <h1 className="text-2xl md:text-3xl font-black text-[#111111] mb-2 flex items-center gap-2">
              歡迎回來 <Sparkles size={24} className="text-[#FDE047] fill-[#FDE047]" />
            </h1>
            <p className="text-slate-500 font-bold text-sm md:text-base">
              使用 Google 快速登入或註冊，今天也為毛孩記錄健康吧！
            </p>
          </div>

          <div className="space-y-4">
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-2xl py-4 hover:bg-slate-50 hover:border-slate-200 transition-all text-base font-bold text-slate-700 shadow-sm">
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              使用 Google 繼續
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}