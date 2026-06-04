// src/app/page.tsx
import FoodImageUploader from '@/components/features/FoodImageUploader';
import BmiCalculatorForm from '@/components/features/BmiCalculatorForm';
import Link from 'next/link';
import { LayoutDashboard, Activity } from 'lucide-react';
import { getCurrentUserId } from '@/lib/auth-util';

export default async function HomePage() {
  const userId = await getCurrentUserId();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      {/* Navigation ด้านบน */}
      <nav className="p-6 flex justify-between items-center border-b border-gray-800 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="text-xl font-black bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent flex items-center">
          <Activity className="text-orange-500 mr-2" size={24} />
          AI CALORIE
        </div>
        <Link 
          href="/dashboard" 
          className="flex items-center text-sm font-bold text-gray-400 hover:text-orange-500 transition-colors bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800"
        >
          <LayoutDashboard size={18} className="mr-2"/> แดชบอร์ด
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 mt-4">
        {/* หัวข้อหน้าเว็บ */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Smart Health <span className="text-orange-500">Analysis</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            เริ่มต้นวันใหม่ด้วยการเช็คสุขภาพของคุณ และจัดการพลังงานจากอาหารด้วยเทคโนโลยี AI
          </p>
        </div>

        <div className="space-y-12">
          
          {/* 1. ส่วนวิเคราะห์ดัชนีมวลกาย (BMI) - ไว้บนสุด */}
          <section className="w-full">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                <Activity size={18} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-100">การวิเคราะห์ดัชนีมวลกาย</h2>
            </div>
            <div className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-2xl">
              <BmiCalculatorForm userId={userId} />
            </div>
          </section>

          <div className="border-t border-gray-800 my-8"></div>

          {/* 2. ส่วนเครื่องสแกนอาหาร (AI Scanner) - ลำดับถัดมา */}
          <section className="w-full">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                <Activity size={18} className="text-white rotate-90" />
              </div>
              <h2 className="text-2xl font-bold text-gray-100">AI Calorie Scanner</h2>
            </div>
            <div className="max-w-2xl mx-auto">
              <FoodImageUploader userId={userId} />
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
