'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { X, Smartphone } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#111113] border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* แท็บเลือกระหว่าง เข้าสู่ระบบ กับ สมัครสมาชิก */}
        <div className="flex bg-[#050506] p-1 rounded-2xl border border-gray-800 mb-8">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'login'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'register'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            สมัครสมาชิก
          </button>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
            {activeTab === 'login' ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีใหม่'}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto break-words whitespace-pre-line">
            {activeTab === 'login' 
              ? 'เข้าสู่ระบบเพื่อบันทึกและซิงค์ข้อมูลดัชนีมวลกาย\nและประวัติการทานอาหารของคุณไว้บนคลาวด์'
              : 'สมัครสมาชิกเพื่อบันทึกประวัติสุขภาพ\nและเข้าถึงระบบวิเคราะห์แคลอรีด้วย AI ฟรี'}
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => signIn('google')}
            className="w-full flex items-center justify-center gap-3 bg-white text-black py-3.5 px-4 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-md text-sm cursor-pointer"
          >
            {/* SVG โลโก้ Google */}
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {activeTab === 'login' ? 'เข้าสู่ระบบด้วย Google' : 'สมัครใช้งานด้วย Google'}
          </button>

          <button 
            onClick={() => signIn('facebook')}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-[#1877F2]/90 transition-colors shadow-md text-sm cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
            </svg>
            {activeTab === 'login' ? 'เข้าสู่ระบบด้วย Facebook' : 'สมัครใช้งานด้วย Facebook'}
          </button>

          <button 
            onClick={() => signIn('line')}
            className="w-full flex items-center justify-center gap-3 bg-[#06C755] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-[#06C755]/90 transition-colors shadow-md text-sm cursor-pointer"
          >
            <Smartphone className="w-5 h-5" />
            {activeTab === 'login' ? 'เข้าสู่ระบบด้วย LINE' : 'สมัครใช้งานด้วย LINE'}
          </button>
        </div>
        
        <div className="mt-8 text-center text-[10px] text-gray-500 leading-relaxed max-w-xs mx-auto break-words">
          การดำเนินการต่อหมายความว่าคุณยอมรับเงื่อนไขการให้บริการ และนโยบายความเป็นส่วนตัวของเรา
        </div>
      </div>
    </div>
  );
}
