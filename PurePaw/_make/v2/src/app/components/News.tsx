import { Newspaper } from "lucide-react";

export function News() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Newspaper size={48} className="text-slate-400" />
      </div>
      <h2 className="text-2xl font-black mb-2">快訊與通知</h2>
      <p className="text-slate-500 font-medium max-w-xs">
        最新的營養知識、優惠活動以及系統通知都會顯示在這裡。
      </p>
    </div>
  );
}
