/* PurePaw UI Kit — Home / 總覽. Faithful port of v2 Home.tsx.
   Pet profile hero + health overview + schedules. */

function IconChip({ name, bgColor }) {
  return (
    <div className="w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm border border-slate-900/5 text-[#111111]" style={{ backgroundColor: bgColor }}>
      <LineFillIcon name={name} />
    </div>
  );
}

function HealthTag({ children, accent }) {
  if (accent) return (
    <span className="bg-[#D98A53] text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm">
      <Icon name="Sparkles" size={10} strokeWidth={3} /> {children}
    </span>
  );
  return <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">{children}</span>;
}

function Home({ navigate }) {
  return (
    <div className="px-6 md:px-8 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2 md:pt-4 max-w-2xl mx-auto w-full">

      {/* Pet profile hero (full-bleed photo) */}
      <div className="relative shrink-0 -mx-6 md:-mx-8 -mt-28 md:-mt-4 mb-8 h-[560px] md:h-[700px] overflow-hidden flex flex-col justify-end md:rounded-t-[24px]">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1602241628512-459cdd3234fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080" alt="布丁" className="w-full h-full object-cover object-top scale-125 origin-top" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#F4F7FB] via-[#F4F7FB]/80 to-transparent"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center pb-6 md:pb-10 px-4">
          <div className="w-fit flex flex-col items-start">
            <h1 className="text-2xl md:text-3xl font-bold mb-3 text-[#3A332C] tracking-widest drop-shadow-sm">布丁</h1>
            <div className="flex flex-wrap gap-3">
              {["黃金獵犬", "♂ 已結紮", "3歲2個月"].map((t) => (
                <span key={t} className="bg-[#FAF8F5]/80 backdrop-blur-md px-5 py-2 rounded-full text-sm font-bold text-[#3A332C] shadow-sm border border-white/40">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Single column (matches mobile on all sizes) */}
      <div className="flex flex-col gap-8 pb-8">

        {/* Health & quick actions */}
        <div className="flex flex-col">
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
                <Icon name="Activity" size={16} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">健康檔案概覽</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-10">
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <IconChip name="bone" bgColor="#FEF1E2" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">飲食需知</h3>
                <div className="flex flex-wrap gap-1.5">
                  <HealthTag>雞肉</HealthTag><HealthTag>鴨肉</HealthTag><HealthTag accent>蜂膠</HealthTag>
                </div>
              </div>
            </div>
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <IconChip name="medbox" bgColor="#FDE2EC" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">確診疾病</h3>
                <div className="flex flex-wrap gap-1.5"><HealthTag>腎臟病</HealthTag></div>
              </div>
            </div>
            <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <IconChip name="pill" bgColor="#EAF5ED" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">日常症狀</h3>
                <div className="flex flex-wrap gap-1.5"><HealthTag>舔咬左腳</HealthTag><HealthTag>淚腺</HealthTag><HealthTag>牙結石</HealthTag></div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight mb-4">快速功能</h2>
          <div className="flex flex-col gap-4 mb-2">
            <div className="bg-[#FEF1E2] rounded-[32px] p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-5 right-5 text-[#D98A53] opacity-30">
                <Icon name="Sparkles" size={72} />
              </div>
              <h3 className="font-bold text-xl mb-2 relative z-10 text-slate-900">毛孩成長分析</h3>
              <p className="text-sm text-slate-700 font-medium mb-6 relative z-10 w-3/4">一歲以下的幼貓幼犬，建議提供高蛋白質的配方。</p>
              <div className="flex flex-wrap items-center gap-2 relative z-10">
                <span className="bg-white/70 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 backdrop-blur-md shadow-sm border border-white/50">已記錄 2 餐</span>
                <span className="bg-white/70 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 backdrop-blur-md shadow-sm border border-white/50">目標達成 85%</span>
              </div>
            </div>
            <button onClick={() => navigate("/diary", "#diet-record")} className="w-full text-left bg-[#111111] rounded-[32px] p-5 flex items-center justify-between group hover:bg-black transition-colors shadow-lg shadow-black/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shrink-0"><Icon name="Plus" size={22} strokeWidth={3} /></div>
                <div><h4 className="text-white font-bold text-lg">飲食紀錄</h4><p className="text-slate-400 text-sm font-medium">記錄今天的食物或換食</p></div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all shrink-0"><Icon name="ArrowUpRight" size={20} /></div>
            </button>
          </div>
        </div>

        {/* Schedules */}
        <div className="w-full flex flex-col">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-8 lg:mb-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-700"><Icon name="Sparkles" size={16} /></div>
              <h3 className="font-bold text-slate-800">重要日程</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#D98A53]/50 transition-colors cursor-pointer bg-white">
                <Icon name="Calendar" size={24} strokeWidth={2.5} className="text-[#111111] mb-2" />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1">年度疫苗</span>
                <span className="text-sm font-bold text-[#D98A53]">剩 15 天</span>
              </div>
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#5C946E]/50 transition-colors cursor-pointer bg-white">
                <Icon name="Droplets" size={24} strokeWidth={2.5} className="text-[#111111] mb-2" />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1">體外驅蟲</span>
                <span className="text-sm font-bold text-slate-400 group-hover:text-[#5C946E] transition-colors">剩 24 天</span>
              </div>
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#F391B3]/50 transition-colors cursor-pointer bg-white">
                <Icon name="Cake" size={24} strokeWidth={2.5} className="text-[#111111] mb-2" />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1">生日</span>
                <span className="text-sm font-bold text-slate-700">09-12</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100"><Icon name="Calendar" size={16} /></div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">未來日程表</h2>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
            <button className="flex-1 py-2 rounded-full text-sm font-bold bg-[#111111] text-white shadow-sm transition-all">醫療</button>
            <button className="flex-1 py-2 rounded-full text-sm font-bold text-slate-500 hover:text-black transition-all">美容</button>
            <button className="flex-1 py-2 rounded-full text-sm font-bold text-slate-500 hover:text-black transition-all">節日</button>
          </div>

          <div className="space-y-4">
            <ScheduleCard icon="syringe" bg="#FEF1E2" title="核心疫苗補打" sub="每年一次接種" subAccent days="剩 15 天" daysColor="#D98A53" date="2025-12-15" last="2024-11-08" />
            <ScheduleCard icon="parasite" bg="#EAF5ED" title="心介爽 (防蟲)" sub="每兩個月一次" days="剩 24 天" daysColor="#5C946E" date="2025-12-24" last="2024-11-08" />
          </div>

          {/* 健康指標 (v1 量化指標整併) */}
          <div className="flex items-center gap-2 mt-10 mb-4">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100"><Icon name="HeartPulse" size={16} /></div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">健康指標</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <HealthMetric icon="Heart" bg="#FDE2EC" label="體態評分" value="未記錄" />
            <HealthMetric icon="Zap" bg="#FEF1E2" label="活力指數" value="未記錄" />
            <HealthMetric icon="Droplets" bg="#EDF3FB" label="水分攝取" value="未記錄" />
          </div>

          {/* 營養綜合分析表 (v1 成分綜合分析整併) */}
          <IngredientAnalysis />
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ icon, bg, title, sub, subAccent, days, daysColor, date, last }) {
  return (
    <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <IconChip name={icon} bgColor={bg} />
          <div>
            <h4 className="font-bold text-lg text-slate-900 mb-1">{title}</h4>
            <div className={`flex items-center gap-1 text-[11px] font-bold ${subAccent ? "text-[#D98A53]" : "text-slate-500"}`}>
              <Icon name={subAccent ? "ArrowUpRight" : "Calendar"} size={14} strokeWidth={subAccent ? 3 : 2.5} /> {sub}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-xl" style={{ color: daysColor }}>{days}</div>
          <div className="text-[10px] font-bold text-slate-400">{date}</div>
        </div>
      </div>
      <div className="border-t-2 border-slate-100 pt-3 flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Icon name="Calendar" size={14} strokeWidth={2.5} /> 上次紀錄</div>
        <div className="text-xs font-bold text-slate-700">{last}</div>
      </div>
    </div>
  );
}

function HealthMetric({ icon, bg, label, value }) {
  return (
    <div className="bg-white border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#111111]" style={{ backgroundColor: bg }}>
        <Icon name={icon} size={18} strokeWidth={2.2} />
      </div>
      <p className="text-sm font-bold text-slate-800">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 leading-tight">{label}</p>
    </div>
  );
}

Object.assign(window, { Home });
