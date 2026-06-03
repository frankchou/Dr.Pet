import { Outlet, NavLink, useNavigate, Link } from "react-router";
import { Home, PieChart, Settings as SettingsIcon, Bell, Book, Camera, Newspaper, Stethoscope, ChevronDown, Plus, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { LogoSVG } from "./Logo";

export function Layout() {
  const [scrolled, setScrolled] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);

  useEffect(() => {
    let lastScrollY = 0;
    
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const currentScrollY = target.scrollTop;
      
      setScrolled(currentScrollY > 10);
      
      if (currentScrollY > lastScrollY && currentScrollY > 20) {
        setIsScrollingDown(true);
      } else if (currentScrollY < lastScrollY) {
        setIsScrollingDown(false);
      }
      
      lastScrollY = currentScrollY;
    };

    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex justify-center text-slate-900 font-sans md:justify-start">
      
      {/* 💻 Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-screen bg-white border-r border-slate-100 z-30 pt-8 shadow-sm">
        <div className="px-8 mb-12 flex items-center gap-3 text-black font-black text-xl tracking-tight leading-tight">
          <LogoSVG />
          <div>
            <div>PurePaw</div>
            <div className="text-sm text-slate-500 font-bold tracking-widest">無敏毛孩</div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 flex flex-col gap-2">
          <NavLink to="/" className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${isActive ? 'bg-[#111111] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-black'}`}>
            <Home size={20} strokeWidth={2.5} />
            <span>首頁</span>
          </NavLink>
          <NavLink to="/diary" className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${isActive ? 'bg-[#111111] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-black'}`}>
            <Book size={20} strokeWidth={2.5} />
            <span>日誌</span>
          </NavLink>
          <label className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-slate-400 hover:bg-slate-50 hover:text-black cursor-pointer">
            <Camera size={20} strokeWidth={2.5} />
            <span>照相</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" />
          </label>
          <NavLink to="/nutritionist" className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${isActive ? 'bg-[#111111] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-black'}`}>
            <Stethoscope size={20} strokeWidth={2.5} />
            <span>營養師</span>
          </NavLink>
          <NavLink to="/news" className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${isActive ? 'bg-[#111111] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-black'}`}>
            <Newspaper size={20} strokeWidth={2.5} />
            <span>快訊</span>
          </NavLink>
        </nav>

        {/* Desktop Profile Menu */}
        <div className="relative mt-auto border-t border-slate-100/50">
          {showProfileMenu && (
            <div className="absolute bottom-full left-4 w-56 mb-2 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-50 mb-1">
                <p className="text-xs text-slate-400 font-bold mb-2">切換毛孩</p>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px] font-bold">M</div>
                  <span className="text-sm font-bold text-slate-800">Max (目前)</span>
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#D98A53] text-white flex items-center justify-center text-[10px] font-bold">B</div>
                  <span className="text-sm font-bold text-slate-800">Bella</span>
                </button>
              </div>
              <div className="py-1">
                <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700">
                  <SettingsIcon size={16} />
                  <span className="text-sm font-bold">設定</span>
                </Link>
                <Link to="/login" onClick={() => setShowProfileMenu(false)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-red-500">
                  <LogOut size={16} />
                  <span className="text-sm font-bold">登出</span>
                </Link>
              </div>
            </div>
          )}
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
              <img 
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col truncate flex-1">
              <span className="text-sm font-bold truncate">Alex & Max</span>
              <span className="text-xs text-slate-400 font-medium">Pro Plan</span>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>

      {/* 
        Responsive Container 
        - Mobile: Full width, acts like an app shell
        - Desktop: Takes remaining width next to sidebar
      */}
      <div className="w-full md:flex-1 md:ml-64 bg-white md:bg-transparent shadow-2xl md:shadow-none sm:overflow-hidden flex flex-col relative h-[100dvh]">
        
        {/* Main scrollable content */}
        <main id="main-scroll-container" className="flex-1 overflow-y-auto pb-28 md:pb-10 hide-scrollbar relative">
          
          {/* Header */}
          <header 
            className="px-6 md:px-10 pt-12 md:pt-10 pb-4 flex items-center justify-between z-30 sticky top-0 bg-transparent pointer-events-none"
          >
            {/* Mobile Profile */}
            <div className={`relative flex items-center gap-3 md:hidden transition-all duration-300 ${isScrollingDown ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`}>
              <div 
                className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shadow-sm border border-white/50 cursor-pointer"
                onClick={() => setShowMobileProfileMenu(!showMobileProfileMenu)}
              >
                <img 
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {showMobileProfileMenu && (
                <div className="absolute top-12 left-0 w-52 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 z-50 pointer-events-auto">
                  <div className="px-3 py-2 border-b border-slate-50 mb-1">
                    <p className="text-xs text-slate-400 font-bold mb-2">切換毛孩</p>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px] font-bold">M</div>
                      <span className="text-sm font-bold text-slate-800">Max (目前)</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-[#D98A53] text-white flex items-center justify-center text-[10px] font-bold">B</div>
                      <span className="text-sm font-bold text-slate-800">Bella</span>
                    </button>
                  </div>
                  <div className="py-1">
                    <Link to="/settings" onClick={() => setShowMobileProfileMenu(false)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700">
                      <SettingsIcon size={16} />
                      <span className="text-sm font-bold">設定</span>
                    </Link>
                    <Link to="/login" onClick={() => setShowMobileProfileMenu(false)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-red-500">
                      <LogOut size={16} />
                      <span className="text-sm font-bold">登出</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {/* Desktop Title / Mobile Logo */}
            <div className={`transition-all duration-300 ${isScrollingDown ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`}>
              <div className="hidden md:block">
                <h2 className="text-2xl font-black tracking-tight">總覽</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">讓我們來看看 Max 今天的營養狀況吧</p>
              </div>
              <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 mt-0.5">
                <LogoSVG width="24" height="24" />
                <div className="flex flex-col justify-center leading-none">
                  <span className="font-black tracking-tight text-base text-[#111111]">PurePaw</span>
                </div>
              </div>
            </div>

            <button className={`w-10 h-10 rounded-full border border-white/40 bg-white/30 backdrop-blur-md flex items-center justify-center hover:bg-white/60 transition-all duration-300 shadow-sm ml-auto ${isScrollingDown ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'}`}>
              <Bell size={20} className="text-slate-800" />
            </button>
          </header>

          <div className="max-w-6xl mx-auto w-full min-h-full flex flex-col md:bg-white md:rounded-[40px] md:shadow-sm md:border md:border-slate-100 md:mt-2 md:mb-6 md:p-6" onClick={() => { setShowMobileProfileMenu(false); setShowProfileMenu(false); }}>
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation (Hidden on Desktop) */}
        <nav className="md:hidden absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-2 flex items-center justify-between z-20 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
          <NavLink 
            to="/" 
            className={({isActive}) => `flex flex-col items-center gap-1 w-12 ${isActive ? 'text-black' : 'text-slate-400'}`}
          >
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">首頁</span>
          </NavLink>
          
          <NavLink 
            to="/diary" 
            className={({isActive}) => `flex flex-col items-center gap-1 w-12 ${isActive ? 'text-black' : 'text-slate-400'}`}
          >
            <Book size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">日誌</span>
          </NavLink>

          {/* Center Floating Camera Button */}
          <div className="relative -top-6 flex flex-col items-center">
            <label className="w-14 h-14 bg-[#111111] text-white rounded-full flex items-center justify-center shadow-lg shadow-black/20 hover:scale-105 transition-transform cursor-pointer">
              <Camera size={26} strokeWidth={2.5} />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
              />
            </label>
          </div>

          <NavLink 
            to="/nutritionist" 
            className={({isActive}) => `flex flex-col items-center gap-1 w-12 ${isActive ? 'text-black' : 'text-slate-400'}`}
          >
            <Stethoscope size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">營養師</span>
          </NavLink>

          <NavLink 
            to="/news" 
            className={({isActive}) => `flex flex-col items-center gap-1 w-12 ${isActive ? 'text-black' : 'text-slate-400'}`}
          >
            <Newspaper size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">快訊</span>
          </NavLink>
        </nav>

      </div>
    </div>
  );
}
