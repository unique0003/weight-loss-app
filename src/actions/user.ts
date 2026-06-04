// src/actions/user.ts
'use server';

import { prisma } from '@/lib/prisma';
import { calculateBMI } from '@/utils/calculations';
import { revalidatePath } from 'next/cache';

// --- Offline / Mock Fallback System with Circuit Breaker ---
// ช่วยให้แอปพลิเคชันยังทำงานได้อย่างสมบูรณ์แบบ แม้ฐานข้อมูล Supabase จะถูกพักการใช้งาน (Paused) หรือออฟไลน์
let isDbOffline = false;
let lastDbErrorTime = 0;
const DB_RETRY_INTERVAL_MS = 15000; // ทุกๆ 15 วินาที จะเปิดโอกาสให้ต่อฐานข้อมูลอีกครั้ง (Circuit Breaker)

let mockUserProfile = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  name: 'ผู้ใช้งานทั่วไป (Mock Mode 📴)',
  gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
  birthYear: 1995,
  height: 170.0,
  isMock: true,
};

let mockWeightLogs: any[] = [
  { id: 'mock-w-1', userId: 'test-user-id-123', weight: 75.0, bmi: 26.0, recordedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
  { id: 'mock-w-2', userId: 'test-user-id-123', weight: 73.8, bmi: 25.5, recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { id: 'mock-w-3', userId: 'test-user-id-123', weight: 72.0, bmi: 24.9, recordedAt: new Date() },
];

function checkIsConnectionError(error: any): boolean {
  const errMsg = error?.message || '';
  return (
    isDbOffline ||
    errMsg.includes('ENOTFOUND') ||
    errMsg.includes('tenant/user') ||
    errMsg.includes('PrismaClientInitializationError') ||
    errMsg.includes('Can\'t reach database') ||
    errMsg.includes('Authentication failed')
  );
}

function shouldBypassDb(): boolean {
  // หากระบบติดธง Offline และยังไม่ครบ 15 วินาที ให้ bypass DB ไปใช้ Mock ทันทีเพื่อความรวดเร็ว
  return isDbOffline && (Date.now() - lastDbErrorTime < DB_RETRY_INTERVAL_MS);
}

/**
 * บันทึกหรืออัปเดตน้ำหนักใหม่ พร้อมคำนวณ BMI อัตโนมัติ
 */
export async function addWeightLog(userId: string, newWeight: number) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    // 1. ดึงข้อมูล User (ถ้าไม่มีให้ auto-create)
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { height: true },
    });

    if (!user) {
      await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@example.com`,
          name: 'ผู้ใช้งานทั่วไป',
          gender: 'MALE',
          birthYear: 1995,
          height: 170.0,
        },
      });
      user = { height: 170.0 };
    }

    // 2. คำนวณ BMI ใหม่โดยใช้ฟังก์ชันจาก utils
    const currentBmi = calculateBMI(newWeight, user.height || 170.0);

    // 3. บันทึกประวัติน้ำหนักใหม่
    const weightLog = await prisma.weightLog.create({
      data: {
        userId: userId,
        weight: newWeight,
        bmi: currentBmi,
      },
    });

    isDbOffline = false; // เชื่อมต่อสำเร็จ เคลียร์สถานะ Offline

    revalidatePath('/dashboard');
    revalidatePath('/');

    return { success: true, data: weightLog };
  } catch (error: any) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      console.log('⚠️ Database Offline: Switching to Mock Weight Logs');
      
      const mockLog = {
        id: `mock-w-${Date.now()}`,
        userId: userId,
        weight: newWeight,
        bmi: calculateBMI(newWeight, mockUserProfile.height),
        recordedAt: new Date(),
        isMock: true
      };
      
      mockWeightLogs = [mockLog, ...mockWeightLogs];
      revalidatePath('/dashboard');
      revalidatePath('/');
      return { success: true, data: mockLog, isOffline: true };
    }
    
    console.error('Error adding weight log:', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

/**
 * ดึงข้อมูลประวัติน้ำหนักล่าสุดของผู้ใช้
 */
export async function getLatestWeight(userId: string) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    const latestLog = await prisma.weightLog.findFirst({
      where: { userId: userId },
      orderBy: { recordedAt: 'desc' },
    });
    
    isDbOffline = false;
    return { success: true, data: latestLog };
  } catch (error) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      return { success: true, data: mockWeightLogs[0] || null, isOffline: true };
    }
    console.error('Error fetching latest weight:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลน้ำหนักได้' };
  }
}

/**
 * ดึงข้อมูลประวัติน้ำหนักทั้งหมดของผู้ใช้
 */
export async function getWeightLogs(userId: string) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    const logs = await prisma.weightLog.findMany({
      where: { userId: userId },
      orderBy: { recordedAt: 'desc' },
    });
    
    isDbOffline = false;
    return { success: true, data: logs };
  } catch (error) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      return { success: true, data: mockWeightLogs, isOffline: true };
    }
    console.error('Error fetching weight logs:', error);
    return { success: false, error: 'ไม่สามารถดึงประวัติน้ำหนักได้' };
  }
}

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้ (หากไม่พบ จะสร้างขึ้นใหม่)
 */
export async function getUserProfile(userId: string) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@example.com`,
          name: 'ผู้ใช้งานทั่วไป',
          gender: 'MALE',
          birthYear: 1995,
          height: 170.0,
        },
      });
    }

    isDbOffline = false;
    return { success: true, data: user };
  } catch (error) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      return { success: true, data: mockUserProfile, isOffline: true };
    }
    console.error('Error fetching user profile:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้' };
  }
}

/**
 * บันทึกหรืออัปเดตข้อมูลโปรไฟล์ผู้ใช้งาน
 */
export async function upsertUserProfile(data: {
  userId: string;
  name?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birthYear: number;
  height: number;
}) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    const updatedUser = await prisma.user.upsert({
      where: { id: data.userId },
      update: {
        name: data.name,
        gender: data.gender,
        birthYear: data.birthYear,
        height: data.height,
      },
      create: {
        id: data.userId,
        email: `${data.userId}@example.com`,
        name: data.name || 'ผู้ใช้งานทั่วไป',
        gender: data.gender,
        birthYear: data.birthYear,
        height: data.height,
      },
    });

    isDbOffline = false;
    revalidatePath('/dashboard');
    revalidatePath('/');
    return { success: true, data: updatedUser };
  } catch (error) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      console.log('⚠️ Database Offline: Saving Profile to Mock Profile');
      
      mockUserProfile = {
        id: data.userId,
        email: `${data.userId}@example.com`,
        name: `${data.name || 'ผู้ใช้งานทั่วไป'} (Mock Mode 📴)`,
        gender: data.gender,
        birthYear: data.birthYear,
        height: data.height,
        isMock: true
      };
      
      revalidatePath('/dashboard');
      revalidatePath('/');
      return { success: true, data: mockUserProfile, isOffline: true };
    }
    console.error('Error upserting user profile:', error);
    return { success: false, error: 'ไม่สามารถบันทึกข้อมูลส่วนตัวได้' };
  }
}

/**
 * ลบข้อมูลประวัติน้ำหนัก
 */
export async function deleteWeightLog(id: string) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    await prisma.weightLog.delete({
      where: { id: id },
    });
    
    isDbOffline = false;
    revalidatePath('/dashboard');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      mockWeightLogs = mockWeightLogs.filter(w => w.id !== id);
      revalidatePath('/dashboard');
      revalidatePath('/');
      return { success: true, isOffline: true };
    }
    console.error('Error deleting weight log:', error);
    return { success: false, error: 'ไม่สามารถลบข้อมูลน้ำหนักได้' };
  }
}