import { useState } from "react";
import { ChevronLeft, Menu, Camera, Info, PawPrint, Weight, Hash, Calendar, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Settings() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'params'>('profile');

  const [pets, setPets] = useState([
    {
      id: '1',
      name: '布丁',
      breed: '黃金獵犬',
      gender: 'male_neutered',
      birthDate: '2023-04-15',
      weight: '32.5',
      chipNumber: '990000012345678',
      image: 'https://images.unsplash.com/photo-1602241628512-459cdd3234fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjByZXRyaWV2ZXIlMjBkb2clMjBmYWNlfGVufDF8fHx8MTc4MDI5MzM4MHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      id: '2',
      name: 'Bella',
      breed: '米克斯',
      gender: 'female_neutered',
      birthDate: '2022-08-10',
      weight: '12.0',
      chipNumber: '990000087654321',
      image: ''
    }
  ]);

  const updatePet = (id: string, field: string, value: string) => {
    setPets(pets.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addNewPet = () => {
    const newId = Date.now().toString();
    setPets([...pets, {
      id: newId,
      name: '新毛孩',
      breed: '',
      gender: 'male',
      birthDate: '',
      weight: '',
      chipNumber: '',
      image: ''
    }]);
  };
  
  const [params, setParams] = useState([
    { id: '1', label: '日常飲食紀錄', enabled: true },
    { id: '2', label: '用藥與看診', enabled: true },
    { id: '3', label: '洗澡美容', enabled: true },
    { id: '4', label: '體重追蹤', enabled: false },
    { id: '5', label: '飲水量', enabled: false },
    { id: '6', label: '活動量與散步', enabled: true },
    { id: '7', label: '嘔吐 / 毛球', enabled: true },
    { id: '8', label: '排泄狀況', enabled: true },
    { id: '9', label: '睡眠品質', enabled: true },
    { id: '10', label: '換食計畫追蹤', enabled: true },
    { id: '11', label: '異常症狀', enabled: true },
    { id: '12', label: '備註與心情', enabled: false },
    { id: '13', label: '我的標籤', enabled: true },
  ]);

  const toggleParam = (id: string) => {
    setParams(params.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 bg-[#F4F7FB]">
      
      {/* Header */}
      <div className="flex items-center justify-center mb-6 relative">
        <button 
          onClick={() => navigate(-1)}
          className="absolute left-0 w-10 h-10 flex items-center justify-start text-slate-700"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-black tracking-tight text-slate-900">設定與檔案</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-full mb-8">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black'}`}
        >
          毛孩檔案
        </button>
        <button 
          onClick={() => setActiveTab('params')}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'params' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black'}`}
        >
          紀錄參數設定
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm font-bold text-slate-500 text-center mb-4">左右滑動以切換毛孩</p>
          <div className="flex overflow-x-auto snap-x snap-mandatory -mx-6 md:-mx-8 px-6 md:px-8 pb-8 space-x-6 hide-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {pets.map((pet) => (
              <div key={pet.id} className="w-[calc(100vw-3rem)] md:w-[600px] shrink-0 snap-center">
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative mb-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-sm bg-[#F5F1E8] flex items-center justify-center">
                      {pet.image ? (
                        <ImageWithFallback src={pet.image} alt={pet.name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-[#D98A53] text-4xl font-black">{pet.name.charAt(0)}</span>
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center border-4 border-[#F4F7FB] shadow-sm hover:scale-105 transition-transform">
                      <Camera size={16} />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
                      <Info size={18} className="text-slate-400" />
                      <h3 className="font-bold text-slate-800 text-sm">基本資訊</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">名字</label>
                        <input 
                          type="text" 
                          value={pet.name}
                          onChange={e => updatePet(pet.id, 'name', e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Breed & Gender */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">品種</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><PawPrint size={16} /></div>
                            <input 
                              type="text" 
                              value={pet.breed}
                              onChange={e => updatePet(pet.id, 'breed', e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                        
                        <div className="w-[120px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">性別</label>
                          <select 
                            value={pet.gender}
                            onChange={e => updatePet(pet.id, 'gender', e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all appearance-none"
                          >
                            <option value="male">公</option>
                            <option value="female">母</option>
                            <option value="male_neutered">公 (已結紮)</option>
                            <option value="female_neutered">母 (已結紮)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
                      <Weight size={18} className="text-slate-400" />
                      <h3 className="font-bold text-slate-800 text-sm">生理與晶片</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Birth & Weight */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">生日</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Calendar size={16} /></div>
                            <input 
                              type="date" 
                              value={pet.birthDate}
                              onChange={e => updatePet(pet.id, 'birthDate', e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                        
                        <div className="w-[120px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">體重 (kg)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={pet.weight}
                            onChange={e => updatePet(pet.id, 'weight', e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Chip */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">晶片號碼</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Hash size={16} /></div>
                          <input 
                            type="text" 
                            value={pet.chipNumber}
                            onChange={e => updatePet(pet.id, 'chipNumber', e.target.value)}
                            placeholder="輸入 15 碼晶片編號"
                            className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="pt-4">
                    <button className="w-full bg-[#111111] text-white font-bold rounded-2xl py-4 hover:bg-black transition-colors shadow-lg shadow-black/10">
                      儲存檔案
                    </button>
                  </div>
                  
                </div>
              </div>
            ))}
            
            {/* Add New Pet Card */}
            <div className="w-[calc(100vw-3rem)] md:w-[600px] shrink-0 snap-center flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <button onClick={addNewPet} className="flex flex-col items-center gap-3 text-slate-400 hover:text-slate-600 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <Plus size={32} />
                  </div>
                  <span className="font-bold">新增毛孩檔案</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'params' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <p className="text-sm font-bold text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              點選以隱藏或顯示以下項目。<br/>
              按下並拖曳項目以調整日誌表單中的順序。
            </p>
          </div>

          {/* List */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {params.map((param, index) => (
              <div 
                key={param.id} 
                className={`flex items-center justify-between p-4 ${index !== params.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <span className="text-sm font-bold text-slate-800">{param.label}</span>
                <div className="flex items-center gap-4">
                  {/* Custom Switch */}
                  <button 
                    onClick={() => toggleParam(param.id)}
                    className={`w-[48px] h-7 rounded-full relative transition-colors duration-300 ${param.enabled ? 'bg-[#111111]' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${param.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                  
                  {/* Drag Handle */}
                  <div className="text-slate-300 cursor-grab hover:text-slate-500 transition-colors">
                    <Menu size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}