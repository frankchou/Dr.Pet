/* PurePaw UI Kit — App shell. Faithful port of v2 Layout.tsx.
   Desktop: fixed left sidebar. Mobile: app shell + floating bottom nav
   with a centred black camera FAB. State-based routing via props. */

const { useState, useEffect, useRef } = React;

function NavItem({ icon, label, active, onClick, desktop }) {
  if (desktop) {
    return (
      <button onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all w-full text-left ${active ? "bg-[#111111] text-white shadow-md" : "text-slate-400 hover:bg-slate-50 hover:text-black"}`}>
        <Icon name={icon} size={20} strokeWidth={2.5} />
        <span>{label}</span>
      </button>
    );
  }
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-12 ${active ? "text-black" : "text-slate-400"}`}>
      <Icon name={icon} size={22} strokeWidth={2.5} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function ProfileMenu({ onNavigate }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 w-full" style={{ boxShadow: "var(--pp-shadow-pop)" }}>
      <div className="px-3 py-2 border-b border-slate-50 mb-1">
        <p className="text-xs text-slate-400 font-bold mb-2">切換毛孩</p>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px] font-bold">布</div>
          <span className="text-sm font-bold text-slate-800">布丁 (目前)</span>
        </button>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#D98A53] text-white flex items-center justify-center text-[10px] font-bold">B</div>
          <span className="text-sm font-bold text-slate-800">Bella</span>
        </button>
      </div>
      <div className="py-1">
        <button onClick={() => onNavigate("/settings")} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700">
          <Icon name="Settings" size={16} /><span className="text-sm font-bold">設定</span>
        </button>
        <button onClick={() => onNavigate("/login")} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-red-500">
          <Icon name="LogOut" size={16} /><span className="text-sm font-bold">登出</span>
        </button>
      </div>
    </div>
  );
}

const NAV = [
  { to: "/", icon: "Home", label: "首頁" },
  { to: "/diary", icon: "Book", label: "日誌" },
  { to: "/nutritionist", icon: "Stethoscope", label: "營養師" },
  { to: "/news", icon: "Newspaper", label: "快訊" },
];

function Layout({ route, navigate, children, onCamera }) {
  const [scrolled, setScrolled] = useState(false);
  const [down, setDown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let last = 0;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      setScrolled(y > 10);
      if (y > last && y > 20) setDown(true);
      else if (y < last) setDown(false);
      last = y;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const headerTitle = {
    "/": ["總覽", "讓我們來看看 布丁 今天的營養狀況吧"],
    "/diary": ["日誌", "記錄毛孩的每一天"],
    "/settings": ["設定與檔案", "管理毛孩資料與紀錄參數"],
    "/nutritionist": ["AI 營養師", "專屬毛孩的營養諮詢"],
    "/news": ["快訊", "最新營養知識與通知"],
    "/snapshot": ["快照", "毛孩的影像紀錄"],
  }[route] || ["總覽", ""];

  const fade = scrolled ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100 translate-y-0 pointer-events-auto";
  const hideChrome = route === "/nutritionist";

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex justify-center text-slate-900 md:justify-start" style={{ fontFamily: "var(--pp-font)" }}>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-screen bg-white border-r border-slate-100 z-30 pt-8 shadow-sm">
        <div className="px-8 mb-12 flex items-center gap-3 text-black font-bold text-xl tracking-tight leading-tight">
          <LogoSVG />
          <div>
            <div>PurePaw</div>
            <div className="text-sm text-slate-500 font-bold tracking-widest">無敏毛孩</div>
          </div>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          <NavItem desktop icon="Home" label="首頁" active={route === "/"} onClick={() => navigate("/")} />
          <NavItem desktop icon="Book" label="日誌" active={route === "/diary"} onClick={() => navigate("/diary")} />
          <button onClick={onCamera} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-slate-400 hover:bg-slate-50 hover:text-black cursor-pointer text-left">
            <Icon name="Camera" size={20} strokeWidth={2.5} /><span>照相</span>
          </button>
          <NavItem desktop icon="Stethoscope" label="營養師" active={route === "/nutritionist"} onClick={() => navigate("/nutritionist")} />
          <NavItem desktop icon="Newspaper" label="快訊" active={route === "/news"} onClick={() => navigate("/news")} />
        </nav>
        <div className="relative mt-auto border-t border-slate-100/50">
          {showProfile && (
            <div className="absolute bottom-full left-4 right-4 mb-2 z-50">
              <ProfileMenu onNavigate={(r) => { setShowProfile(false); navigate(r); }} />
            </div>
          )}
          <div onClick={() => setShowProfile(!showProfile)} className="px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col truncate flex-1">
              <span className="text-sm font-bold truncate">Alex &amp; 布丁</span>
              <span className="text-xs text-slate-400 font-medium">Pro Plan</span>
            </div>
            <Icon name="ChevronDown" size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>

      {/* Content column */}
      <div className="w-full md:flex-1 md:ml-64 bg-white md:bg-transparent shadow-2xl md:shadow-none flex flex-col relative h-[100dvh] overflow-hidden">
        <main ref={scrollRef} id="main-scroll-container" className="flex-1 overflow-y-auto pb-28 md:pb-10 hide-scrollbar relative">

          {/* Header */}
          <header className="px-6 md:px-10 pt-12 md:pt-10 pb-4 flex items-center justify-between z-30 sticky top-0 bg-transparent pointer-events-none">
            {/* Mobile profile */}
            <div className={`relative flex items-center gap-3 md:hidden transition-all duration-300 ${fade} ${hideChrome ? "invisible" : ""}`}>
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shadow-sm border border-white/50 cursor-pointer" onClick={() => setShowMobileProfile(!showMobileProfile)}>
                <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" alt="Profile" className="w-full h-full object-cover" />
              </div>
              {showMobileProfile && (
                <div className="absolute top-12 left-0 w-52 z-50 pointer-events-auto">
                  <ProfileMenu onNavigate={(r) => { setShowMobileProfile(false); navigate(r); }} />
                </div>
              )}
            </div>
            {/* Title (desktop) / logo (mobile) */}
            <div className={`transition-all duration-300 ${fade}`}>
              <div className="hidden md:block">
                <h2 className="text-2xl font-bold tracking-tight">{headerTitle[0]}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">{headerTitle[1]}</p>
              </div>
            </div>
            <button className={`w-10 h-10 rounded-full border border-white/40 bg-white/30 backdrop-blur-md flex items-center justify-center hover:bg-white/60 transition-all duration-300 shadow-sm ml-auto ${fade} ${hideChrome ? "hidden" : ""}`}>
              <Icon name="Bell" size={20} className="text-slate-800" />
            </button>
          </header>

          <div className="max-w-6xl mx-auto w-full min-h-full flex flex-col md:bg-white md:rounded-[40px] md:shadow-sm md:border md:border-slate-100 md:mt-2 md:mb-6 md:p-6"
            onClick={() => { setShowMobileProfile(false); setShowProfile(false); }}>
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-2 flex items-center justify-between z-20" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)", boxShadow: "var(--pp-shadow-nav)" }}>
          <NavItem icon="Home" label="首頁" active={route === "/"} onClick={() => navigate("/")} />
          <NavItem icon="Book" label="日誌" active={route === "/diary"} onClick={() => navigate("/diary")} />
          <div className="relative -top-6 flex flex-col items-center">
            <button onClick={onCamera} className="w-14 h-14 bg-[#111111] text-white rounded-full flex items-center justify-center shadow-lg shadow-black/20 hover:scale-105 transition-transform cursor-pointer">
              <Icon name="Camera" size={26} strokeWidth={2.5} />
            </button>
          </div>
          <NavItem icon="Stethoscope" label="營養師" active={route === "/nutritionist"} onClick={() => navigate("/nutritionist")} />
          <NavItem icon="Newspaper" label="快訊" active={route === "/news"} onClick={() => navigate("/news")} />
        </nav>
      </div>
    </div>
  );
}

Object.assign(window, { Layout });
