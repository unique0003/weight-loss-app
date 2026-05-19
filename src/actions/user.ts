// src/actions/user.ts
'use server';

import { prisma } from '@/lib/prisma';
import { calculateBMI } from '@/utils/calculations';
import { revalidatePath } from 'next/cache';

/**
 * บันทึกหรืออัปเดตน้ำหนักใหม่ พร้อมคำนวณ BMI อัตโนมัติ
 */
export async function addWeightLog(userId: string, newWeight: number) {
  try {
    // 1. ดึงข้อมูล User เพื่อเอาส่วนสูงมาคำนวณ BMI
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { height: true },
    });

    if (!user) {
      return { success: false, error: 'ไม่พบข้อมูลผู้ใช้งาน' };
    }

    // 2. คำนวณ BMI ใหม่โดยใช้ฟังก์ชันจาก utils
    const currentBmi = calculateBMI(newWeight, user.height);

    // 3. บันทึกประวัติน้ำหนักใหม่
    const weightLog = await prisma.weightLog.create({
      data: {
        userId: userId,
        weight: newWeight,
        bmi: currentBmi,
      },
    });

    // 4. สั่งให้ Next.js รีเฟรชข้อมูลในหน้า Dashboard ทันทีโดยไม่ต้องโหลดหน้าเว็บใหม่
    revalidatePath('/dashboard');

    return { success: true, data: weightLog };
  } catch (error) {
    console.error('Error adding weight log:', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

/**
 * ดึงข้อมูลประวัติน้ำหนักล่าสุดของผู้ใช้
 */
export async function getLatestWeight(userId: string) {
  try {
    const latestLog = await prisma.weightLog.findFirst({
      where: { userId: userId },
      orderBy: { recordedAt: 'desc' }, // เรียงจากวันที่ล่าสุด
    });
    
    return { success: true, data: latestLog };
  } catch (error) {
    console.error('Error fetching latest weight:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลน้ำหนักได้' };
  }
}