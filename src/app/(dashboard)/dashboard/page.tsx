// src/app/(dashboard)/dashboard/page.tsx
import { getFoodLogs } from '@/actions/food';
import DashboardUI from '@/components/features/DashboardUI';

export default async function DashboardPage() {
  const dummyUserId = 'test-user-id-123'; // ใช้ ID เดียวกับที่เรา Mock ไว้
  const response = await getFoodLogs(dummyUserId);
  
  // ✨ แก้ไขบรรทัดนี้: ใช้ || [] เพื่อบังคับให้เป็น Array เสมอ ลดปัญหา TypeScript งอแง
  const logs = response.data || [];

  return <DashboardUI initialLogs={logs} />;
}