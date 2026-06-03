import { Stethoscope } from "lucide-react";

export function Nutritionist() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="w-24 h-24 bg-[#E2F3E4] rounded-full flex items-center justify-center mb-6">
        <Stethoscope size={48} className="text-[#2D6A4F]" />
      </div>
      <h2 className="text-2xl font-black mb-2">AI 營養師</h2>
      <p className="text-slate-500 font-medium max-w-xs">
        專屬 AI 營養師功能即將上線，為您的毛孩提供最專業的飲食建議！
      </p>
    </div>
  );
}