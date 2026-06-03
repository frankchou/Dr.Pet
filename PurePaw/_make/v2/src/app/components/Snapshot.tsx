import { Camera } from "lucide-react";

export function Snapshot() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Camera size={48} className="text-slate-400" />
      </div>
      <h2 className="text-2xl font-black mb-2">快照功能開發中</h2>
      <p className="text-slate-500 font-medium max-w-xs">
        這裡將會是毛孩專屬的影像紀錄區，您可以隨時拍下毛孩的可愛瞬間與便便狀態！
      </p>
    </div>
  );
}
