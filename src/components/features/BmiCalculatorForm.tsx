// src/components/features/BmiCalculatorForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calculator, Trash2, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { calculateBMI, getBMICategory, calculateBMR, calculateCalorieGoal } from '@/utils/calculations';

export default function BmiCalculatorForm() {
  const [mounted, setMounted] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  
  const [result, setResult] = useState<{
    bmi: number;
    category: string;
    bmr: number;
    tdee: number;
    targetDaily: number;
    targetPerMeal: number;
  } | null>(null);

  // โหลดข้อมูลจาก localStorage เมื่อ Component ถูก Mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('bmi_calc_v1');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setWeight(data.weight || '');
        setHeight(data.height || '');
        setAge(data.age || '');
        setGender(data.gender || 'MALE');
        setResult(data.result || null);
      } catch (error) {
        console.error("Failed to parse localStorage data");
      }
    }
  }, []);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);

    if (w > 0 && h > 0 && a > 0) {
      const bmi = calculateBMI(w, h);
      const category = getBMICategory(bmi);
      const bmr = calculateBMR(w, h, a, gender);
      const goals = calculateCalorieGoal(bmr);

      const newResult = {
        bmi: parseFloat(bmi.toFixed(1)),
        category,
        bmr: Math.round(bmr),
        tdee: Math.round(goals.tdee),
        targetDaily: Math.round(goals.targetDaily),
        targetPerMeal: Math.round(goals.targetPerMeal)
      };

      setResult(newResult);
      
      // บันทึกข้อมูลลง localStorage
      localStorage.setItem('bmi_calc_v1', JSON.stringify({
        weight, height, age, gender, result: newResult
      }));
    }
  };

  const handleClear = () => {
    if (!confirm('ต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?')) return;
    setWeight('');
    setHeight('');
    setAge('');
    setGender('MALE');
    setResult(null);
    localStorage.removeItem('bmi_calc_v1');
  };

  // ฟังก์ชันคำนวณตำแหน่งของเข็มชี้ (Needle) บนแถบสี BMI
  const getMarkerPosition = (bmi: number) => {
    if (bmi < 18.5) return (bmi / 18.5) * 25; // 0-25%
    if (bmi < 23) return 25 + ((bmi - 18.5) / 4.5) * 25; // 25-50%
    if (bmi < 30) return 50 + ((bmi - 23) / 7) * 25; // 50-75%
    return 75 + Math.min((bmi - 30) / 10, 1) * 25; // 75-100%
  };

  // ดึงข้อความแนะนำตามเกณฑ์ BMI
  const getSuggestion = (bmi: number) => {
    if (bmi < 18.5) return { label: 'ผอม (Underweight)', text: 'ควรรับประทานอาหารให้เพียงพอ' };
    if (bmi < 23) return { label: 'ปกติ (Normal)', text: 'รักษาน้ำหนักให้อยู่ในเกณฑ์นี้' };
    if (bmi < 30) return { label: 'น้ำหนักเกิน (Overweight)', text: 'ควรควบคุมอาหารและออกกำลังกาย' };
    return { label: 'อ้วน (Obese)', text: 'ควรลดน้ำหนักเพื่อสุขภาพที่ดี' };
  };

  // รอให้ Hydration เสร็จสิ้นเพื่อป้องกัน Error จาก localStorage
  if (!mounted) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* 🚀 FORM CARD */}
      <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center text-gray-200 font-medium mb-6">
          <LayoutTemplate size={18} className="text-orange-500 mr-2" />
          BMI & calorie calculator
        </div>

        <form onSubmit={handleCalculate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">น้ำหนัก (kg)</label>
              <input 
                type="number" step="0.1" required
                className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                value={weight} onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">ส่วนสูง (cm)</label>
              <input 
                type="number" step="0.1" required
                className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                value={height} onChange={(e) => setHeight(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">อายุ (ปี)</label>
              <input 
                type="number" required
                className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                value={age} onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">เพศ</label>
              <select 
                className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                value={gender} onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE')}
              >
                <option value="MALE">ชาย</option>
                <option value="FEMALE">หญิง</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full flex items-center justify-center border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white py-3 rounded-lg transition-colors mt-2 text-sm font-medium"
          >
            <Calculator size={16} className="mr-2" /> คำนวณ
          </button>
        </form>
      </div>

      {/* 🚀 RESULT CARD */}
      {result && (
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center text-gray-200 font-medium">
              <LayoutTemplate size={18} className="text-orange-500 mr-2" />
              ผลการวิเคราะห์
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-xs text-green-500">
                <CheckCircle2 size={14} className="mr-1" /> บันทึกแล้ว
              </span>
              <button 
                onClick={handleClear}
                className="flex items-center text-xs text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/50 px-3 py-1.5 rounded-md transition-colors"
              >
                <Trash2 size={14} className="mr-1" /> ล้างข้อมูล
              </button>
            </div>
          </div>

          {/* BMI Info */}
          <div className="flex items-end mb-4">
            <span className="text-5xl font-bold text-orange-500 mr-4 tracking-tighter">{result.bmi}</span>
            <div className="pb-1">
              <div className="font-bold text-gray-100">{getSuggestion(result.bmi).label}</div>
              <div className="text-sm text-gray-400">{getSuggestion(result.bmi).text}</div>
            </div>
          </div>

          {/* BMI Bar */}
          <div className="mb-8">
            <div className="relative h-2.5 w-full flex rounded-full overflow-hidden mb-2">
              <div className="h-full bg-blue-400 w-1/4"></div>
              <div className="h-full bg-green-500 w-1/4"></div>
              <div className="h-full bg-yellow-500 w-1/4"></div>
              <div className="h-full bg-red-400 w-1/4"></div>
              {/* Marker Needle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-all duration-1000 ease-out"
                style={{ left: `calc(${getMarkerPosition(result.bmi)}% - 2px)` }}
              ></div>
            </div>
            <div className="flex text-[10px] text-gray-500">
              <div className="w-1/4 text-left">ผอม<br/>&lt;18.5</div>
              <div className="w-1/4 text-center">ปกติ 18.5–22.9</div>
              <div className="w-1/4 text-center">น้ำหนักเกิน 23–29.9</div>
              <div className="w-1/4 text-right">อ้วน &ge;30</div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#2a2a2a] p-4 rounded-xl border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">BMR (พักผ่อน)</div>
              <div className="text-xl font-bold text-white mb-1">{result.bmr}</div>
              <div className="text-[10px] text-gray-500">kcal/วัน</div>
            </div>
            
            <div className="bg-[#2a2a2a] p-4 rounded-xl border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <div className="text-xs text-gray-400 mb-1">เป้าหมายรายวัน</div>
              <div className="text-xl font-bold text-orange-500 mb-1">{result.targetDaily}</div>
              <div className="text-[10px] text-gray-500">kcal/วัน</div>
            </div>

            <div className="bg-[#2a2a2a] p-4 rounded-xl border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">แนะนำต่อมื้อ</div>
              <div className="text-xl font-bold text-white mb-1">{result.targetPerMeal}</div>
              <div className="text-[10px] text-gray-500">kcal/มื้อ</div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-xs text-gray-500 border-t border-gray-800 pt-4">
            คำนวณจาก: น้ำหนัก {weight} kg, ส่วนสูง {height} cm, อายุ {age} ปี ({gender === 'MALE' ? 'ชาย' : 'หญิง'}) — เป้าหมายเพื่อลดน้ำหนักอย่างปลอดภัย (TDEE – 500 kcal)
          </div>
        </div>
      )}
    </div>
  );
}