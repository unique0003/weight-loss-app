export const dynamic = 'force-dynamic';

import { getFoodLogs } from '@/actions/food';
import { getWeightLogs, getUserProfile } from '@/actions/user';
import DashboardUI from '@/components/features/DashboardUI';
import { getCurrentUserId } from '@/lib/auth-util';
import { auth } from '@/auth';

export default async function DashboardPage() {
  const dummyUserId = await getCurrentUserId();
  const session = await auth();
  const isLoggedIn = !!session?.user;

  // คำนวณวันที่ "วันนี้" ตาม timezone ไทย (ICT = UTC+7)
  const THAI_OFFSET_MINUTES = -420; // UTC+7 = -420 นาที (getTimezoneOffset() ของ ICT)
  const now = new Date();
  // แปลงเวลา UTC ปัจจุบันเป็น local ICT แล้วดึงเฉพาะ YYYY-MM-DD
  const ictNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const todayDateStr = ictNow.toISOString().split('T')[0]; // e.g. "2026-06-02"
  
  // เรียกข้อมูลทั้งหมดแบบคู่ขนาน (Parallel) เพื่อประสิทธิภาพสูงสุด
  const [todayFoodRes, allFoodRes, weightRes, profileRes] = await Promise.all([
    getFoodLogs(dummyUserId, todayDateStr, THAI_OFFSET_MINUTES),  // ดึงเฉพาะวันนี้ (ICT)
    getFoodLogs(dummyUserId),                                       // ดึงทั้งหมด (สำหรับกราฟ)
    getWeightLogs(dummyUserId),
    getUserProfile(dummyUserId),
  ]);
  
  const todayFoodLogs = todayFoodRes.data || [];
  const allFoodLogs = allFoodRes.data || [];
  const weightLogs = weightRes.data || [];
  const userProfile = profileRes.data || null;

  return (
    <DashboardUI 
      userId={dummyUserId}
      isLoggedIn={isLoggedIn}
      initialLogs={todayFoodLogs}
      allLogs={allFoodLogs}
      weightLogs={weightLogs} 
      userProfile={userProfile} 
    />
  );
}