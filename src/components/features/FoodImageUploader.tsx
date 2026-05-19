// src/components/features/FoodImageUploader.tsx
'use client';

import { useState, useEffect } from 'react';
import { analyzeAndSaveFoodLog } from '@/actions/food';
import { Sun, Moon, Coffee } from 'lucide-react';

export default function FoodImageUploader() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');

  const [foodNameInput, setFoodNameInput] = useState('');
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [portionInput, setPortionInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ foodName: string; calories: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ detect mobile ฝั่ง client เท่านั้น (ป้องกัน SSR error)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/iPhone|Android|iPad/i.test(navigator.userAgent));
  }, []);

  // ✅ compress + set image — ใช้ร่วมกันทั้ง 2 input
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setImagePreview(compressed);
          setBase64Image(compressed);
          setResult(null);
          setError(null);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).value = '';
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setBase64Image(null);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!base64Image) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const dummyUserId = 'test-user-id-123';

    try {
      const response = await analyzeAndSaveFoodLog(dummyUserId, mealType, base64Image, {
        name: foodNameInput.trim() !== '' ? foodNameInput : undefined,
        ingredients: ingredientsInput.trim() !== '' ? ingredientsInput : undefined,
        portion: portionInput.trim() !== '' ? portionInput : undefined,
      });

      if (response.success && response.data) {
        setResult({
          foodName: response.data.foodName,
          calories: response.data.calories,
        });
      } else {
        setError(response.error || 'เกิดข้อผิดพลาดในการวิเคราะห์');
      }
    } catch {
      setError('การเชื่อมต่อกับ AI ขัดข้อง');
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 ข้อมูลตั้งค่าปุ่มมื้ออาหาร
  const mealOptions = [
    { id: 'BREAKFAST', label: 'เช้า', icon: Sun, iconColor: 'text-blue-400' },
    { id: 'LUNCH', label: 'เที่ยง', icon: Sun, iconColor: 'text-green-400' },
    { id: 'DINNER', label: 'เย็น', icon: Moon, iconColor: 'text-orange-400' },
    { id: 'SNACK', label: 'ว่าง', icon: Coffee, iconColor: 'text-purple-400' },
  ] as const;

  return (
    <div className="w-full mx-auto bg-transparent p-2 md:p-4">
      {/* ซ่อน Header ไว้ในระดับ Mobile หากใช้งานผ่าน Dashboard จะได้ไม่รก แต่คงไว้บน Desktop */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          AI Calorie <span className="text-orange-500">Scanner</span>
        </h2>
        <p className="text-sm text-gray-400 mt-2">ประเมินแคลอรีด้วยรูปภาพ พร้อมปรับแต่งให้แม่นยำขึ้น</p>
      </div>

      <div className="space-y-6">
        
        {/* ✨ ส่วนเลือกมื้ออาหารที่ปรับดีไซน์ใหม่ */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">มื้ออาหาร</label>
          <div className="grid grid-cols-4 gap-3">
            {mealOptions.map((meal) => {
              const Icon = meal.icon;
              const isActive = mealType === meal.id;
              
              return (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => setMealType(meal.id)}
                  className={`flex flex-col items-center justify-center py-4 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-800 border-gray-500 shadow-md'
                      : 'bg-[#111] border-gray-800 hover:border-gray-600 hover:bg-gray-900'
                  }`}
                >
                  <Icon size={20} className={`${meal.iconColor} mb-2`} />
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {meal.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* อัปโหลด / ถ่ายรูป */}
        <div>
          {!imagePreview ? (
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {isMobile && (
                <div className="relative border-2 border-dashed border-orange-500/30 rounded-xl p-6 flex flex-col items-center justify-center bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer group overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    onClick={handleInputClick}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    {...{ capture: 'environment' }}
                  />
                  <div className="w-12 h-12 mb-3 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-orange-500">ถ่ายรูปเลย</p>
                </div>
              )}

              <div className="relative border-2 border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center bg-[#111] hover:bg-gray-900 transition-colors cursor-pointer group overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  onClick={handleInputClick}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 mb-3 mx-auto bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {isMobile ? 'เลือกจากคลัง' : 'คลิก หรือ ลากรูปมาวางที่นี่'}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative group rounded-xl border border-gray-700 overflow-hidden">
              <img src={imagePreview} alt="ตัวอย่างรูปภาพ" className="w-full h-56 object-cover" />
              <button
                onClick={handleClearImage}
                className="absolute top-3 right-3 bg-red-500/90 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="ลบรูปภาพนี้"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* ข้อมูลเสริมแก่ AI */}
        <div className="bg-[#111] p-5 rounded-xl border border-gray-800">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ตัวช่วยให้ AI แม่นยำขึ้น (ระบุหรือไม่ก็ได้)
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="ชื่อเมนู (เช่น กะเพราเนื้อ, สลัดไก่ทอด)"
              value={foodNameInput}
              onChange={(e) => setFoodNameInput(e.target.value)}
              className="w-full px-4 py-2.5 text-base font-medium text-white placeholder-gray-600 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-[#0a0a0a] transition-colors"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="วัตถุดิบ (เช่น ข้าวกล้อง)"
                value={ingredientsInput}
                onChange={(e) => setIngredientsInput(e.target.value)}
                className="w-full px-4 py-2.5 text-base font-medium text-white placeholder-gray-600 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-[#0a0a0a] transition-colors"
              />
              <input
                type="text"
                placeholder="ปริมาณ (เช่น ครึ่งจาน)"
                value={portionInput}
                onChange={(e) => setPortionInput(e.target.value)}
                className="w-full px-4 py-2.5 text-base font-medium text-white placeholder-gray-600 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-[#0a0a0a] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ปุ่มวิเคราะห์ */}
        <button
          onClick={handleAnalyze}
          disabled={!base64Image || isLoading}
          className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-wide flex justify-center items-center ${
            !base64Image
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : isLoading
              ? 'bg-gray-700 text-gray-300 cursor-wait shadow-inner'
              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-[0_4px_14px_0_rgba(249,115,22,0.39)]'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              กำลังวิเคราะห์ข้อมูล...
            </>
          ) : (
            'ANALYZE FOOD'
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-900/20 text-red-400 text-sm rounded-xl font-medium border border-red-900/50">
            🚨 {error}
          </div>
        )}

        {/* ผลลัพธ์ */}
        {result && (
          <div className="mt-4 p-6 bg-[#161616] rounded-xl text-white border-l-4 border-orange-500 animate-fade-in flex justify-between items-center shadow-lg border border-gray-800 border-l-orange-500">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ผลการประเมิน</p>
              <h3 className="text-lg font-bold text-white">{result.foodName}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">แคลอรี</p>
              <div className="font-mono text-2xl font-bold text-orange-400">
                {result.calories} <span className="text-sm text-gray-500">kcal</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}