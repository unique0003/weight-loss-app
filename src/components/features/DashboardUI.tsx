// src/components/features/DashboardUI.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Home, 
  LayoutDashboard, 
  Trash2, 
  Flame, 
  Target, 
  TrendingDown, 
  Clock, 
  ChevronRight, 
  Sun, 
  Moon, 
  Coffee, 
  Save, 
  Settings, 
  Scale, 
  Activity, 
  Plus, 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteFoodLog } from '@/actions/food';
import { addWeightLog, deleteWeightLog, upsertUserProfile } from '@/actions/user';
import { calculateBMR, calculateCalorieGoal, calculateBMI, getBMICategory } from '@/utils/calculations';
import FoodImageUploader from './FoodImageUploader';
import CalorieChart from './CalorieChart';
import LoginModal from './LoginModal';
import { signOut, useSession } from 'next-auth/react';

interface DashboardUIProps {
  userId: string;
  isLoggedIn?: boolean;
  initialLogs: any[];  // เฉพาะ logs ของวันนี้เท่านั้น
  allLogs?: any[];     // logs ทั้งหมดสำหรับแสดงกราฟรายสัปดาห์/ปี
  weightLogs?: any[];
  userProfile?: any;
}

export default function DashboardUI({ 
  userId,
  isLoggedIn = false,
  initialLogs, 
  allLogs = [],
  weightLogs = [], 
  userProfile = null 
}: DashboardUIProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ป้องกัน Next.js Client Router Cache ค้าง
  useEffect(() => {
    // 1. ล็อกอินแล้ว แต่เซิร์ฟเวอร์ยังเข้าใจว่าไม่ได้ล็อกอิน
    if (status === 'authenticated' && !isLoggedIn) {
      console.log('[Auth Sync] Client logged in, refreshing server component...');
      router.refresh();
    }
    // 2. ออกจากระบบแล้ว แต่เซิร์ฟเวอร์ยังเข้าใจว่าล็อกอินอยู่
    if (status === 'unauthenticated' && isLoggedIn) {
      console.log('[Auth Sync] Client logged out, refreshing server component...');
      router.refresh();
    }
  }, [status, isLoggedIn, router]);

  // ป้องกันการค้างจากปุ่มกดย้อนกลับ (Back Button) ของเบราว์เซอร์ (BFcache / History Navigation)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      let isBack = event.persisted;
      
      // ตรวจสอบ Performance API หากเบราว์เซอร์ไม่ได้ใช้ BFcache แต่เป็นการกดย้อนกลับ
      if (!isBack && typeof window !== 'undefined' && window.performance) {
        // เช็คแบบ Legacy
        if (window.performance.navigation?.type === 2) { // TYPE_BACK_FORWARD = 2
          isBack = true;
        }
        // เช็คแบบ Modern API
        const navEntries = performance.getEntriesByType("navigation");
        if (navEntries.length > 0 && (navEntries[0] as PerformanceNavigationTiming).type === "back_forward") {
          isBack = true;
        }
      }

      if (isBack) {
        console.log('[Back Button Detect] Reloading page to reset auth states...');
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // --- States ---
  const [todayLogs, setTodayLogs] = useState<any[]>(initialLogs);
  const [chartLogs] = useState<any[]>(allLogs); // logs ทั้งหมดสำหรับกราฟ (ไม่ filter วัน)
  const [weights, setWeights] = useState<any[]>(weightLogs);
  const [profile, setProfile] = useState<any>(userProfile);

  const [isDeletingFood, setIsDeletingFood] = useState<string | null>(null);
  const [isDeletingWeight, setIsDeletingWeight] = useState<string | null>(null);

  // Auth & Login Modal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Quick weight logger state
  const [newWeight, setNewWeight] = useState('');
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);

  // Profile Editor state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(profile?.name || 'ผู้ใช้งานทั่วไป');
  const [profileGender, setProfileGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>(profile?.gender || 'MALE');
  const [profileBirthYear, setProfileBirthYear] = useState(profile?.birthYear?.toString() || '1995');
  const [profileHeight, setProfileHeight] = useState(profile?.height?.toString() || '170');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Uploader interaction state
  const [activeMealType, setActiveMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');

  // --- Dynamic calculations from physical profile & latest weight ---
  const latestWeight = useMemo(() => {
    return weights[0]?.weight || 70.0;
  }, [weights]);

  const heightNum = useMemo(() => {
    return profile?.height || parseFloat(profileHeight) || 170.0;
  }, [profile, profileHeight]);

  const age = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const birthYearNum = profile?.birthYear || parseInt(profileBirthYear) || 1995;
    return currentYear - birthYearNum;
  }, [profile, profileBirthYear]);

  const gender = useMemo(() => {
    return profile?.gender || profileGender || 'MALE';
  }, [profile, profileGender]);

  const bmr = useMemo(() => {
    return calculateBMR(latestWeight, heightNum, age, gender);
  }, [latestWeight, heightNum, age, gender]);

  const calorieGoals = useMemo(() => {
    return calculateCalorieGoal(bmr);
  }, [bmr]);

  const GOAL_CALORIES = calorieGoals.targetDaily;
  const targetPerMeal = calorieGoals.targetPerMeal;
  const tdee = calorieGoals.tdee;

  const currentBmi = useMemo(() => {
    return weights[0]?.bmi || calculateBMI(latestWeight, heightNum);
  }, [weights, latestWeight, heightNum]);

  // --- Handlers ---
  const handleDeleteFood = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการอาหารนี้?')) return;
    setIsDeletingFood(id);
    const res = await deleteFoodLog(id);
    if (res.success) {
      setTodayLogs(todayLogs.filter(log => log.id !== id));
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
    setIsDeletingFood(null);
  };

  const handleAddWeightLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (w <= 0 || isNaN(w)) {
      alert('กรุณากรอกน้ำหนักให้ถูกต้อง');
      return;
    }
    setIsLoggingWeight(true);
    const res = await addWeightLog(userId, w);
    if (res.success && res.data) {
      setWeights([res.data, ...weights]);
      setNewWeight('');
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลน้ำหนัก');
    }
    setIsLoggingWeight(false);
  };

  const handleDeleteWeightLog = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบประวัติน้ำหนักรายการนี้?')) return;
    setIsDeletingWeight(id);
    const res = await deleteWeightLog(id);
    if (res.success) {
      setWeights(weights.filter(w => w.id !== id));
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการลบข้อมูลน้ำหนัก');
    }
    setIsDeletingWeight(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const h = parseFloat(profileHeight);
    const y = parseInt(profileBirthYear);
    if (isNaN(h) || h <= 0 || isNaN(y) || y <= 0) {
      alert('กรุณากรอกข้อมูลร่างกายให้ถูกต้อง');
      setIsSavingProfile(false);
      return;
    }
    const res = await upsertUserProfile({
      userId,
      name: profileName,
      gender: profileGender,
      birthYear: y,
      height: h
    });
    if (res.success && res.data) {
      setProfile(res.data);
      setIsEditingProfile(false);
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการบันทึกโปรไฟล์');
    }
    setIsSavingProfile(false);
  };

  const handleQuickSelectMeal = (meal: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK') => {
    setActiveMealType(meal);
    const scannerEl = document.getElementById('food-uploader-container');
    if (scannerEl) {
      scannerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };


  // Weight Trend Chart Data (Last 7 weight records chronological)
  const weightChartData = useMemo(() => {
    return [...weights]
      .slice(0, 7)
      .reverse()
      .map(w => {
        const d = new Date(w.recordedAt);
        return {
          name: d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
          weight: w.weight,
          bmi: w.bmi
        };
      });
  }, [weights]);

  // Consume today - ใช้ todayLogs ตรงๆ ไม่ต้อง filter วันอีก (ได้จาก server แล้ว)
  const todayTotal = useMemo(() => {
    return todayLogs.reduce((sum, log) => sum + log.calories, 0);
  }, [todayLogs]);

  const caloriesRemaining = Math.max(0, GOAL_CALORIES - todayTotal);
  const overCalories = todayTotal > GOAL_CALORIES ? todayTotal - GOAL_CALORIES : 0;

  const getMealUI = (type: string) => {
    switch(type) {
      case 'BREAKFAST': return { label: 'เช้า', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'LUNCH': return { label: 'เที่ยง', style: 'bg-green-500/10 text-green-400 border-green-500/20' };
      case 'DINNER': return { label: 'เย็น', style: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
      case 'SNACK': return { label: 'ว่าง', style: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      default: return { label: 'อื่นๆ', style: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-gray-100 pb-24 md:pb-8 font-sans">
      
      {/* 🚀 1. HEADER */}
      <header className="hidden md:flex justify-between items-center px-6 py-4 bg-[#111113] border border-gray-800/80 rounded-2xl mx-4 mt-4 sticky top-4 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="text-xl font-black bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent flex items-center tracking-wider">
          <Flame className="text-orange-500 mr-2" fill="currentColor" size={22} />
          AI CALORIE & WEIGHT
        </div>
        
        <nav className="flex space-x-2 bg-[#050506] p-1 rounded-xl border border-gray-800 items-center">
          <button onClick={() => router.push('/')} className="flex items-center text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-all font-bold text-xs uppercase tracking-wider">
            <Home size={14} className="mr-2"/> หน้าหลัก
          </button>
          
          {isLoggedIn ? (
            <button 
              onClick={() => signOut()} 
              className="flex items-center text-gray-400 hover:text-red-400 px-4 py-2 rounded-lg transition-all font-bold text-xs uppercase tracking-wider"
            >
              ออกจากระบบ
            </button>
          ) : (
            <button 
              onClick={() => setIsLoginModalOpen(true)} 
              className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:px-4 md:py-8 space-y-6 mt-2 md:mt-0">
        
        {/* 📴 GUEST MODE NOTICE */}
        {!isLoggedIn && (
          <div className="p-4 bg-[#111113] border border-gray-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-gray-300 text-sm">
              <span className="text-white font-bold mr-2">ยังไม่ได้เข้าสู่ระบบ</span> 
              ข้อมูลของคุณถูกบันทึกชั่วคราวบนอุปกรณ์นี้ ล็อคอินเพื่อซิงค์ข้อมูลข้ามอุปกรณ์
            </div>
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              ล็อคอินเลย
            </button>
          </div>
        )}

        {/* 📴 OFFLINE / MOCK FALLBACK NOTICE */}
        {(profile?.isMock || weights.some(w => w.isMock) || todayLogs.some(f => f.isMock)) && (
          <div className="p-5 bg-orange-500/10 border border-orange-500/30 rounded-3xl text-orange-400 text-sm shadow-[0_0_20px_rgba(249,115,22,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-500">
            <div className="flex items-start md:items-center gap-3">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-500/20 text-orange-500 font-mono font-bold text-xs">OFF</span>
              <div>
                <h4 className="font-extrabold text-white">กำลังใช้งานระบบในโหมดจำลอง (Mock/Offline Mode)</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  ตรวจพบว่าโปรเจกต์ Supabase ของคุณถูกพักการใช้งาน (Paused) ชั่วคราว ระบบจึงจำลองข้อมูลให้คุณใช้งานและทดสอบฟีเจอร์ต่าง ๆ และ AI Scanner ได้อย่างราบรื่น
                </p>
              </div>
            </div>
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs font-black uppercase tracking-wider text-orange-500 hover:text-white px-4 py-2 border border-orange-500/20 hover:border-orange-500/60 rounded-xl transition-all self-start md:self-auto bg-[#0a0a0b]/60 hover:bg-orange-500"
            >
              เปิด Supabase Dashboard
            </a>
          </div>
        )}
        {/* 🚀 PROFILE SETTINGS & HEALTH METRICS PROFILE CARD */}
        <section className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/80 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-xs font-mono uppercase text-gray-400 tracking-widest">Physical Profile</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mt-1">ข้อมูลส่วนตัวและระบบเผาผลาญ</h2>
            </div>
            
            <button 
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="flex items-center text-xs font-bold text-gray-300 hover:text-orange-500 border border-gray-700/80 hover:border-orange-500/50 px-4 py-2 rounded-xl transition-all bg-[#0a0a0b]/60"
            >
              <Settings size={14} className="mr-2" />
              {isEditingProfile ? 'ยกเลิก' : 'แก้ไขส่วนสูง/โปรไฟล์'}
            </button>
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0a0a0b]/50 p-5 rounded-2xl border border-gray-800">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1.5">ชื่อของคุณ</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2.5 bg-[#17171a] border border-gray-700 rounded-xl text-white outline-none focus:border-orange-500 transition-all font-medium text-sm"
                  value={profileName} onChange={(e) => setProfileName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1.5">เพศ</label>
                <select 
                  className="w-full px-4 py-2.5 bg-[#17171a] border border-gray-700 rounded-xl text-white outline-none focus:border-orange-500 transition-all font-medium text-sm appearance-none"
                  value={profileGender} onChange={(e) => setProfileGender(e.target.value as any)}
                >
                  <option value="MALE">ชาย</option>
                  <option value="FEMALE">หญิง</option>
                  <option value="OTHER">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1.5">ปีคริสต์ศักราชที่เกิด (เช่น 1995)</label>
                <input 
                  type="number" required min="1930" max="2026"
                  className="w-full px-4 py-2.5 bg-[#17171a] border border-gray-700 rounded-xl text-white outline-none focus:border-orange-500 transition-all font-medium text-sm"
                  value={profileBirthYear} onChange={(e) => setProfileBirthYear(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1.5">ส่วนสูง (เซนติเมตร)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" step="0.1" required
                    className="w-full px-4 py-2.5 bg-[#17171a] border border-gray-700 rounded-xl text-white outline-none focus:border-orange-500 transition-all font-medium text-sm"
                    value={profileHeight} onChange={(e) => setProfileHeight(e.target.value)}
                  />
                  <button 
                    type="submit" disabled={isSavingProfile}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 rounded-xl transition-all shadow-[0_4px_14px_rgba(249,115,22,0.3)] flex items-center justify-center min-w-[70px]"
                  >
                    {isSavingProfile ? '...' : <Save size={16} />}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0a0a0b]/60 p-4 rounded-2xl border border-gray-800">
                <span className="text-[10px] font-mono uppercase text-gray-400 block mb-1">ผู้ใช้งาน</span>
                <span className="text-lg font-bold text-white block truncate">{profile?.name || 'ผู้ใช้งานทั่วไป'}</span>
                <span className="text-xs text-gray-500 mt-1 block">เพศ: {profile?.gender === 'MALE' ? 'ชาย' : profile?.gender === 'FEMALE' ? 'หญิง' : 'อื่นๆ'}, อายุ {age} ปี</span>
              </div>
              
              <div className="bg-[#0a0a0b]/60 p-4 rounded-2xl border border-gray-800">
                <span className="text-[10px] font-mono uppercase text-gray-400 block mb-1">ส่วนสูง</span>
                <span className="text-lg font-bold text-orange-400 block">{heightNum} <span className="text-xs text-gray-500 font-medium">cm</span></span>
                <span className="text-xs text-gray-500 mt-1 block">ส่วนสูงสำหรับคำนวณ BMI</span>
              </div>

              <div className="bg-[#0a0a0b]/60 p-4 rounded-2xl border border-gray-800">
                <span className="text-[10px] font-mono uppercase text-gray-400 block mb-1">ระบบเผาผลาญพื้นฐาน (BMR)</span>
                <span className="text-lg font-bold text-white block">{bmr.toLocaleString()} <span className="text-xs text-gray-500 font-medium">kcal</span></span>
                <span className="text-xs text-gray-500 mt-1 block">เมื่อไม่มีกิจกรรมใดๆ</span>
              </div>

              <div className="bg-[#0a0a0b]/60 p-4 rounded-2xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-yellow-500"></div>
                <span className="text-[10px] font-mono uppercase text-gray-400 block mb-1">ใช้จริงตามกิจกรรม (TDEE)</span>
                <span className="text-lg font-bold text-yellow-400 block">{tdee.toLocaleString()} <span className="text-xs text-gray-500 font-medium">kcal</span></span>
                <span className="text-xs text-gray-500 mt-1 block">นั่งทำงานเป็นหลัก (x1.2)</span>
              </div>
            </div>
          )}
        </section>

        {/* 🚀 2. SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1 */}
          <div className="bg-[#111113] border border-gray-800 rounded-3xl p-5 shadow-lg hover:border-gray-700/80 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] border border-orange-500/10">
                <Flame size={20} />
              </div>
              {todayTotal > 0 && (
                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md">
                  +{todayTotal}
                </span>
              )}
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-white tracking-tight">{todayTotal.toLocaleString()}</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">แคลอรีวันนี้ (kcal)</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#111113] border border-gray-800 rounded-3xl p-5 shadow-lg hover:border-gray-700/80 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/10">
                <Target size={20} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-[#0a0a0b] px-2 py-0.5 rounded-md">
                TDEE - 500
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-white tracking-tight">{GOAL_CALORIES.toLocaleString()}</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">เป้าหมายพลังงาน (kcal)</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#111113] border border-gray-800 rounded-3xl p-5 shadow-lg hover:border-gray-700/80 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500 border border-green-500/10">
                <TrendingDown size={20} />
              </div>
              {overCalories > 0 && (
                <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                  เกินเป้าหมาย {overCalories}
                </span>
              )}
            </div>
            <div className="mt-4">
              <h2 className={`text-3xl font-black tracking-tight ${overCalories > 0 ? 'text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'text-white'}`}>
                {caloriesRemaining.toLocaleString()}
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1">โควต้าเหลือ (kcal)</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#111113] border border-gray-800 rounded-3xl p-5 shadow-lg hover:border-gray-700/80 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/10">
                <Scale size={20} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                currentBmi < 18.5 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                currentBmi <= 22.9 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                currentBmi <= 24.9 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {getBMICategory(currentBmi)}
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-black text-white tracking-tight">{latestWeight.toFixed(1)} <span className="text-sm text-gray-500 font-bold">kg</span></h2>
              <p className="text-xs text-gray-400 font-medium mt-1">BMI ล่าสุด: <span className="text-white font-mono font-bold">{currentBmi.toFixed(1)}</span></p>
            </div>
          </div>
        </div>

        {/* 🚀 3. CHART — Interactive Calorie Tracker */}
        <CalorieChart
          todayLogs={todayLogs}
          allLogs={chartLogs}
          goalCalories={GOAL_CALORIES}
          targetPerMeal={targetPerMeal}
        />

        {/* 🚀 TWO COLUMNS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* COLUMN 1: FOOD SCANNER & QUICK ACCESS */}
          <div className="space-y-6">
            
            {/* FOOD SCANNER ZONE */}
            <div id="food-uploader-container" className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-xl scroll-mt-24">
               <h3 className="text-lg font-bold text-white flex items-center mb-4">
                  <span className="text-orange-500 mr-2 text-xl font-light">+</span> บันทึกและวิเคราะห์รูปอาหารด้วย AI
               </h3>
               
               <div className="border border-dashed border-gray-700/80 rounded-2xl p-2 bg-[#050506]">
                  <FoodImageUploader 
                    userId={userId}
                    externalMealType={activeMealType} 
                    onMealTypeChange={(meal) => setActiveMealType(meal)} 
                  />
               </div>

            </div>

            {/* FOOD HISTORY LIST */}
            <div className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <Clock size={18} className="text-gray-400 mr-2"/>
                  ประวัติมื้ออาหารวันนี้
                </h3>
                <span className="text-xs font-mono text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/10 font-bold">
                  {todayLogs.length} เมนู
                </span>
              </div>
              
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {todayLogs.length > 0 ? (
                  todayLogs.map((log) => {
                    const meal = getMealUI(log.mealType);
                    const logDate = new Date(log.recordedAt);
                    const isLogToday = logDate.toDateString() === new Date().toDateString();
                    const logTime = isLogToday 
                      ? logDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                      : logDate.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }) + ' ' + logDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
                    
                    return (
                      <div key={log.id} className="group relative flex justify-between items-center py-3.5 border-b border-gray-850 last:border-0 hover:bg-[#161619]/30 px-2 rounded-xl transition-all duration-200">
                        <div className="flex items-center space-x-3.5">
                          <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${meal.style}`}>
                            {meal.label}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-100 text-sm">{log.foodName}</h4>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{logTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="text-right mr-2 transition-all duration-300 group-hover:-translate-x-8">
                            <span className="text-base font-bold text-white font-mono">{log.calories}</span>
                            <span className="text-[10px] text-gray-500 block -mt-1 font-mono">kcal</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteFood(log.id)}
                            disabled={isDeletingFood === log.id}
                            className="absolute right-2 opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="ลบรายการนี้"
                          >
                            {isDeletingFood === log.id ? <span className="animate-spin text-xs">...</span> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16">
                    <div className="w-14 h-14 rounded-full bg-[#0a0a0b] border border-gray-800 flex items-center justify-center mb-3">
                      <Clock size={20} className="text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-sm">ยังไม่มีประวัติการกินอาหารในวันนี้</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2: WEIGHT TRACKER SYSTEM */}
          <div className="space-y-6">
            
            {/* WEIGHT LOG CARD */}
            <div className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <h3 className="text-lg font-bold text-white flex items-center mb-4">
                <Scale className="text-orange-500 mr-2" size={18} />
                ระบบติดตามและบันทึกน้ำหนัก
              </h3>

              <form onSubmit={handleAddWeightLog} className="flex gap-2.5 bg-[#050506] p-2.5 rounded-2xl border border-gray-800/80 mb-6">
                <div className="flex-1 relative">
                  <input 
                    type="number" step="0.1" required placeholder="บันทึกน้ำหนักล่าสุด (kg)"
                    className="w-full pl-4 pr-12 py-2.5 bg-[#17171a] border border-gray-800 rounded-xl text-white outline-none focus:border-orange-500 transition-all font-semibold font-mono text-sm placeholder-gray-600"
                    value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                    suppressHydrationWarning
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500 font-bold uppercase">kg</span>
                </div>
                <button 
                  type="submit" disabled={isLoggingWeight}
                  className="bg-[#17171a] hover:bg-orange-500 border border-gray-800 hover:border-orange-500 text-gray-300 hover:text-white font-bold px-5 rounded-xl transition-all flex items-center justify-center text-xs tracking-wider font-mono shadow-md uppercase"
                  suppressHydrationWarning
                >
                  {isLoggingWeight ? '...' : <Plus size={16} />}
                </button>
              </form>

              {/* Weight chart */}
              <div className="bg-[#050506] border border-gray-800 rounded-2xl p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">Weight Trend (7 ครั้งล่าสุด)</span>
                  {weights.length > 0 && (
                    <span className="text-xs font-mono text-gray-500">
                      ล่าสุด: {latestWeight.toFixed(1)} kg ({weights[weights.length-1] ? `ลดจากครั้งแรก ${(weights[weights.length-1].weight - latestWeight).toFixed(1)} kg` : ''})
                    </span>
                  )}
                </div>

                <div className="h-44 w-full">
                  {weightChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={['auto', 'auto']} stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="weight" 
                          stroke="#f97316" 
                          strokeWidth={3} 
                          dot={{ fill: '#f97316', r: 3 }}
                          activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 text-xs py-8">
                      บันทึกน้ำหนักเพื่อแสดงกราฟแนวโน้ม
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* WEIGHT HISTORY LIST */}
            <div className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <Activity size={18} className="text-gray-400 mr-2"/>
                  ประวัติน้ำหนักที่บันทึก
                </h3>
                <span className="text-xs font-mono text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/10 font-bold">
                  {weights.length} รายการ
                </span>
              </div>

              <div className="space-y-3.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {weights.length > 0 ? (
                  weights.map((w) => {
                    const recordedDate = new Date(w.recordedAt).toLocaleDateString('th-TH', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                    
                    return (
                      <div key={w.id} className="group relative flex justify-between items-center py-3 border-b border-gray-850 last:border-0 hover:bg-[#161619]/30 px-2 rounded-xl transition-all duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/10">
                            <Scale size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white font-mono text-base">{w.weight.toFixed(1)}</span>
                              <span className="text-xs text-gray-500 font-semibold font-mono">kg</span>
                            </div>
                            <span className="text-[10px] text-gray-500 block font-mono">{recordedDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div className="text-right mr-2 transition-all duration-300 group-hover:-translate-x-8">
                            <span className="text-xs font-mono font-bold text-gray-400 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-lg">
                              BMI: {w.bmi.toFixed(1)}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleDeleteWeightLog(w.id)}
                            disabled={isDeletingWeight === w.id}
                            className="absolute right-2 opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="ลบรายการนี้"
                          >
                            {isDeletingWeight === w.id ? <span className="animate-spin text-xs">...</span> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16">
                    <div className="w-14 h-14 rounded-full bg-[#0a0a0b] border border-gray-800 flex items-center justify-center mb-3">
                      <Scale size={20} className="text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-sm">ยังไม่มีประวัติการบันทึกน้ำหนัก</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 📱 Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0b]/90 backdrop-blur-xl border-t border-gray-800/80 z-50 flex justify-around items-center p-2 pb-safe shadow-[0_-10px_25px_rgba(0,0,0,0.8)]">
        <button onClick={() => router.push('/')} className="flex flex-col items-center p-2 text-gray-500 hover:text-white transition-colors">
          <Home size={20} />
          <span className="text-[9px] mt-1 font-bold tracking-wider uppercase">หน้าหลัก</span>
        </button>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center text-orange-500 relative -top-3">
          <div className="bg-gradient-to-tr from-orange-600 to-yellow-500 p-3 rounded-full shadow-[0_4px_25px_rgba(249,115,22,0.4)] text-white">
            <LayoutDashboard size={22} />
          </div>
          <span className="text-[9px] mt-1 font-bold tracking-wider uppercase">แดชบอร์ด</span>
        </button>
      </div>

      {/* ล็อคอิน Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}