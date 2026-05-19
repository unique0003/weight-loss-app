// src/components/features/DashboardUI.tsx
'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Home, LayoutDashboard, Trash2, Calendar, Flame, Target, TrendingDown, Clock, ChevronRight, Sun, Moon, Coffee } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteFoodLog } from '@/actions/food';
import FoodImageUploader from './FoodImageUploader';

export default function DashboardUI({ initialLogs }: { initialLogs: any[] }) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [timeframe, setTimeframe] = useState<'DAILY' | 'WEEKLY' | 'YEARLY'>('WEEKLY'); // Default เป็น Weekly (7 วัน)
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const GOAL_CALORIES = 2000; // ตั้งค่าเป้าหมาย (คุณสามารถดึงจาก User Profile ในอนาคตได้)

  // ฟังก์ชันลบข้อมูล
  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) return;
    setIsDeleting(id);
    const res = await deleteFoodLog(id);
    if (res.success) {
      setLogs(logs.filter(log => log.id !== id));
    } else {
      alert(res.error);
    }
    setIsDeleting(null);
  };

  // ประมวลผลข้อมูลสำหรับแสดงกราฟตามช่วงเวลา
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (timeframe === 'DAILY') {
      const todayLogs = logs.filter(l => new Date(l.recordedAt).toDateString() === now.toDateString());
      const grouped: Record<string, number> = { BREAKFAST: 0, LUNCH: 0, DINNER: 0, SNACK: 0 };
      todayLogs.forEach(l => grouped[l.mealType] += l.calories);
      return [
        { name: 'เช้า', calories: grouped.BREAKFAST, isToday: false },
        { name: 'เที่ยง', calories: grouped.LUNCH, isToday: false },
        { name: 'เย็น', calories: grouped.DINNER, isToday: false },
        { name: 'ของว่าง', calories: grouped.SNACK, isToday: false }
      ];
    }
    
    if (timeframe === 'WEEKLY') {
      const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
      const grouped: Record<string, number> = {};
      
      logs.forEach(l => {
        const dateStr = new Date(l.recordedAt).toDateString();
        grouped[dateStr] = (grouped[dateStr] || 0) + l.calories;
      });

      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toDateString();
        const isToday = i === 6;
        return { 
          name: isToday ? 'วันนี้' : days[d.getDay()], 
          calories: grouped[dateStr] || 0,
          isToday 
        };
      });
      return last7Days;
    }

    if (timeframe === 'YEARLY') {
      const thisYearLogs = logs.filter(l => new Date(l.recordedAt).getFullYear() === now.getFullYear());
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const grouped: Record<number, number> = {};
      thisYearLogs.forEach(l => {
        const m = new Date(l.recordedAt).getMonth();
        grouped[m] = (grouped[m] || 0) + l.calories;
      });
      const currentMonth = now.getMonth();
      return months.map((m, i) => ({ 
        name: m, 
        calories: grouped[i] || 0,
        isToday: i === currentMonth 
      }));
    }
    return [];
  }, [logs, timeframe]);

  // คำนวณแคลอรีรวมของวันนี้
  const todayTotal = logs
    .filter(l => new Date(l.recordedAt).toDateString() === new Date().toDateString())
    .reduce((sum, log) => sum + log.calories, 0);
    
  const caloriesRemaining = Math.max(0, GOAL_CALORIES - todayTotal);
  const overCalories = todayTotal > GOAL_CALORIES ? todayTotal - GOAL_CALORIES : 0;

  // ฟังก์ชันแยกสีและไอคอนตามมื้ออาหาร
  const getMealUI = (type: string) => {
    switch(type) {
      case 'BREAKFAST': return { label: 'เช้า', style: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'LUNCH': return { label: 'เที่ยง', style: 'bg-green-500/10 text-green-500 border-green-500/20' };
      case 'DINNER': return { label: 'เย็น', style: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
      case 'SNACK': return { label: 'ว่าง', style: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
      default: return { label: 'อื่นๆ', style: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 pb-24 md:pb-8">
      
      {/* 🚀 1. HEADER */}
      <header className="hidden md:flex justify-between items-center px-6 py-4 bg-[#161616] border border-gray-800 rounded-2xl mx-4 mt-4 sticky top-4 z-40">
        <div className="text-xl font-bold flex items-center text-white">
          <Flame className="text-orange-500 mr-2" fill="currentColor" />
          AI Calorie
        </div>
        <nav className="flex space-x-2 bg-[#0a0a0a] p-1 rounded-xl border border-gray-800">
          <button onClick={() => router.push('/')} className="flex items-center text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm">
            <Home size={16} className="mr-2"/> หน้าหลัก
          </button>
          <button className="flex items-center bg-gray-800 text-white px-4 py-2 rounded-lg font-medium text-sm">
            <LayoutDashboard size={16} className="mr-2"/> แดชบอร์ด
          </button>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:px-4 md:py-8 space-y-6 mt-2 md:mt-0">
        
        {/* 🚀 2. SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#161616] border border-gray-800 rounded-2xl p-4 md:p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <Flame size={20} />
              </div>
              {todayTotal > 0 && <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-md">+{todayTotal}</span>}
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white">{todayTotal.toLocaleString()}</h2>
              <p className="text-xs text-gray-500 mt-1">แคลอรีวันนี้ (kcal)</p>
            </div>
          </div>

          <div className="bg-[#161616] border border-gray-800 rounded-2xl p-4 md:p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <Target size={20} />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white">{GOAL_CALORIES.toLocaleString()}</h2>
              <p className="text-xs text-gray-500 mt-1">เป้าหมายต่อวัน (kcal)</p>
            </div>
          </div>

          <div className="bg-[#161616] border border-gray-800 rounded-2xl p-4 md:p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <TrendingDown size={20} />
              </div>
              {overCalories > 0 && <span className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded-md">เกิน {overCalories}</span>}
            </div>
            <div className="mt-4">
              <h2 className={`text-3xl font-bold ${overCalories > 0 ? 'text-red-500' : 'text-white'}`}>{caloriesRemaining.toLocaleString()}</h2>
              <p className="text-xs text-gray-500 mt-1">เหลืออีก (kcal)</p>
            </div>
          </div>

          <div className="bg-[#161616] border border-gray-800 rounded-2xl p-4 md:p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <Calendar size={20} />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white">7</h2> {/* ตรงนี้คุณสามารถคำนวณจากข้อมูลจริงได้ภายหลัง */}
              <p className="text-xs text-gray-500 mt-1">วันติดต่อกัน (streak)</p>
            </div>
          </div>
        </div>

        {/* 🚀 3. CHART */}
        <div className="bg-[#161616] border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center">
                <Calendar size={20} className="text-orange-500 mr-2"/> 
                แคลอรีรายวัน — {timeframe === 'DAILY' ? 'วันนี้' : timeframe === 'WEEKLY' ? '7 วันล่าสุด' : 'ปีนี้'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">กดปุ่มด้านขวาเพื่อเปลี่ยนช่วงเวลา</p>
            </div>
            
            {/* Tabs เปลี่ยนช่วงเวลา */}
            <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-gray-800 w-full md:w-auto">
              {[
                { id: 'DAILY', label: 'วัน' }, 
                { id: 'WEEKLY', label: 'สัปดาห์' }, 
                { id: 'YEARLY', label: 'ปี' }
              ].map((tf) => (
                <button 
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id as any)}
                  className={`flex-1 md:w-20 py-2 text-xs font-bold rounded-lg transition-all ${
                    timeframe === tf.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#222' }}
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="calories" radius={[6, 6, 6, 6]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#f97316' : '#333'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 🚀 4. UPLOAD ZONE */}
          <div className="bg-[#161616] border border-gray-800 rounded-3xl p-6">
             <h3 className="text-lg font-bold text-white flex items-center mb-4">
                <span className="text-orange-500 mr-2 text-xl font-light">+</span> บันทึกอาหาร
             </h3>
             
             {/* Wrapper สำหรับ FoodImageUploader */}
             <div className="border border-dashed border-gray-700 rounded-2xl p-2 bg-[#0a0a0a]">
                <FoodImageUploader />
             </div>

             <div className="flex items-center justify-center my-6">
                <div className="h-px bg-gray-800 flex-1"></div>
                <span className="text-xs text-gray-500 px-4">หรือเลือกมื้ออาหาร</span>
                <div className="h-px bg-gray-800 flex-1"></div>
             </div>

             {/* Quick Select Buttons */}
             <div className="grid grid-cols-4 gap-3">
                <button className="flex flex-col items-center justify-center py-4 bg-[#111] border border-gray-800 rounded-xl hover:border-gray-600 transition-colors">
                   <Sun size={20} className="text-blue-400 mb-2" />
                   <span className="text-xs font-medium text-gray-300">เช้า</span>
                </button>
                <button className="flex flex-col items-center justify-center py-4 bg-[#111] border border-gray-800 rounded-xl hover:border-gray-600 transition-colors">
                   <Sun size={20} className="text-green-400 mb-2" />
                   <span className="text-xs font-medium text-gray-300">เที่ยง</span>
                </button>
                <button className="flex flex-col items-center justify-center py-4 bg-[#111] border border-gray-800 rounded-xl hover:border-gray-600 transition-colors">
                   <Moon size={20} className="text-orange-400 mb-2" />
                   <span className="text-xs font-medium text-gray-300">เย็น</span>
                </button>
                <button className="flex flex-col items-center justify-center py-4 bg-[#111] border border-gray-800 rounded-xl hover:border-gray-600 transition-colors">
                   <Coffee size={20} className="text-purple-400 mb-2" />
                   <span className="text-xs font-medium text-gray-300">ว่าง</span>
                </button>
             </div>
          </div>

          {/* 🚀 5. HISTORY LIST */}
          <div className="bg-[#161616] border border-gray-800 rounded-3xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Clock size={18} className="text-gray-400 mr-2"/>
                ประวัติวันนี้
              </h3>
              <button className="text-orange-500 text-sm font-medium flex items-center hover:underline">
                ดูทั้งหมด <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {logs.length > 0 ? (
                logs.map((log) => {
                  const meal = getMealUI(log.mealType);
                  const logTime = new Date(log.recordedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
                  
                  return (
                    <div key={log.id} className="group relative flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                      <div className="flex items-center space-x-4">
                        <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${meal.style}`}>
                          {meal.label}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-200 text-sm md:text-base">{log.foodName}</h4>
                          <p className="text-xs text-gray-500">{logTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-right mr-2 transition-transform group-hover:-translate-x-8">
                          <span className="text-base font-bold text-white">{log.calories}</span>
                          <span className="text-[10px] text-gray-500 block -mt-1">kcal</span>
                        </div>
                        {/* ปุ่มลบจะโผล่มาเมื่อ hover */}
                        <button 
                          onClick={() => handleDelete(log.id)}
                          disabled={isDeleting === log.id}
                          className="absolute right-0 opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="ลบรายการนี้"
                        >
                          {isDeleting === log.id ? <span className="animate-spin text-xs">...</span> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                    <Clock size={24} className="text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-sm">ยังไม่มีประวัติการกินในวันนี้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📱 Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-gray-800 z-50 flex justify-around items-center p-2 pb-safe">
        <button onClick={() => router.push('/')} className="flex flex-col items-center p-2 text-gray-500 hover:text-white transition-colors">
          <Home size={22} />
          <span className="text-[10px] mt-1 font-medium">หน้าหลัก</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0)} className="flex flex-col items-center text-orange-500 relative -top-4">
          <div className="bg-linear-to-tr from-orange-600 to-yellow-500 p-3.5 rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] text-white">
            <LayoutDashboard size={24} />
          </div>
          <span className="text-[10px] mt-1 font-bold">แดชบอร์ด</span>
        </button>
      </div>

    </div>
  );
}