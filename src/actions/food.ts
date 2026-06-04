// src/actions/food.ts
'use server';

import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Offline / Mock Fallback System with Circuit Breaker ---
let isDbOffline = false;
let lastDbErrorTime = 0;
const DB_RETRY_INTERVAL_MS = 15000; // ทุกๆ 15 วินาที จะเปิดโอกาสให้ต่อฐานข้อมูลอีกครั้ง

let mockFoodLogs: any[] = [
  { id: 'mock-f-1', userId: 'test-user-id-123', mealType: 'BREAKFAST', foodName: 'ข้าวต้มกุ้งสับ (Mock 📴)', calories: 320, recordedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
  { id: 'mock-f-2', userId: 'test-user-id-123', mealType: 'LUNCH', foodName: 'ข้าวกะเพราหมูสับไข่ดาว (Mock 📴)', calories: 680, recordedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) }
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
  return isDbOffline && (Date.now() - lastDbErrorTime < DB_RETRY_INTERVAL_MS);
}

export async function analyzeAndSaveFoodLog(
  userId: string, 
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK', 
  base64Image: string,
  additionalInfo?: { name?: string; ingredients?: string; portion?: string }
) {
  let foodName = 'สลัดผัก';
  let estimatedCalories = 250;

  try {
    console.log("--- 1. เริ่มระบบสกัดรูปภาพ ---");
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.split(';')[0].split(':')[1];

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json", 
      }
    });

    let prompt = `คุณคือนักโภชนาการ วิเคราะห์รูปภาพอาหารนี้ให้หน่อย บอกชื่ออาหารภาษาไทยและประเมินแคลอรีรวมให้แม่นยำที่สุด 
    ตอบกลับมาเป็น JSON Format เท่านั้น รูปแบบคือ: {"foodName": "ชื่ออาหาร", "calories": ตัวเลขแคลอรี}`;

    if (additionalInfo) {
      const { name, ingredients, portion } = additionalInfo;
      let contextText = "";
      if (name) contextText += `- ชื่อเมนูที่คิดว่าใช่: ${name}\n`;
      if (ingredients) contextText += `- วัตถุดิบ/วิธีปรุง: ${ingredients}\n`;
      if (portion) contextText += `- ปริมาณที่ทานจริง: ${portion}\n`;

      if (contextText) {
        prompt += `\n\nข้อมูลเพิ่มเติมจากผู้ใช้ (ให้ยึดข้อมูลนี้เป็นบริบทหลักร่วมกับรูปภาพในการคำนวณแคลอรี):\n${contextText}`;
        console.log("📝 มีข้อมูลเพิ่มเติมจากผู้ใช้:", contextText);
      }
    }

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      },
    };

    console.log("--- 2. กำลังส่งข้อมูลให้ Gemini วิเคราะห์ ---");
    const result = await model.generateContent([prompt, imagePart]);
    let responseText = result.response.text();
    
    console.log("✅ AI ตอบกลับมาว่า:", responseText);

    responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsedData = JSON.parse(responseText);
    estimatedCalories = Number(parsedData.calories); 
    foodName = parsedData.foodName;

    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    console.log("--- 3. กำลังบันทึกข้อมูลลง Database ---");
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
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
    }

    const newFoodLog = await prisma.foodLog.create({
      data: {
        userId: userId,
        mealType: mealType,
        foodName: foodName,
        calories: estimatedCalories,
      }
    });

    isDbOffline = false;
    console.log("🎉 บันทึกสำเร็จเรียบร้อย!");
    revalidatePath('/dashboard');
    revalidatePath('/');

    return { success: true, data: newFoodLog };

  } catch (error: any) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      console.log('⚠️ Database Offline: Switching to Mock Food Logs & Saving food in memory');
      
      const mockLog = {
        id: `mock-f-${Date.now()}`,
        userId: userId,
        mealType: mealType,
        foodName: `${foodName} (Mock 📴)`,
        calories: estimatedCalories,
        recordedAt: new Date(),
        isMock: true
      };
      
      mockFoodLogs = [mockLog, ...mockFoodLogs];
      revalidatePath('/dashboard');
      revalidatePath('/');
      return { success: true, data: mockLog, isOffline: true };
    }

    console.error("🔥 สาเหตุที่แท้จริงที่ทำให้ Error:", error?.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
    return { success: false, error: error?.message || "ไม่สามารถวิเคราะห์รูปภาพอาหารได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * ดึงข้อมูลประวัติการกินมาโชว์ที่หน้า Dashboard
 * @param userId - ID ของผู้ใช้
 * @param dateStr - (optional) วันที่ต้องการดึงข้อมูลในรูปแบบ ISO string เช่น "2026-06-02"
 *                  ถ้าไม่ระบุจะดึงข้อมูลทั้งหมด
 * @param timezoneOffsetMinutes - (optional) offset ของ timezone ของ client เป็นนาที
 *                                 เช่น สำหรับ ICT (UTC+7) จะส่ง -420
 */
export async function getFoodLogs(
  userId: string,
  dateStr?: string,
  timezoneOffsetMinutes?: number
) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    // สร้าง where clause - ถ้ามี dateStr จะ filter เฉพาะวันที่ระบุ
    const whereClause: Record<string, unknown> = { userId: userId };

    if (dateStr) {
      // คำนวณ start/end of day ตาม timezone ของ client
      const offsetMs = (timezoneOffsetMinutes ?? 0) * 60 * 1000;
      // สร้างวันที่เริ่มต้น 00:00:00 ของวันนั้นตาม timezone client แล้วแปลงเป็น UTC
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      dayStart.setTime(dayStart.getTime() + offsetMs); // ปรับจาก local เป็น UTC
      
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      whereClause.recordedAt = {
        gte: dayStart,
        lt: dayEnd,
      };
    }

    const logs = await prisma.foodLog.findMany({
      where: whereClause,
      orderBy: { recordedAt: 'desc' },
    });
    
    isDbOffline = false;
    return { success: true, data: logs };
  } catch (error) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();

      // ถ้าอยู่ใน offline mode ก็ filter mock data ตามวันที่ (ถ้าระบุ)
      if (dateStr) {
        const filtered = mockFoodLogs.filter(l => {
          const logDate = new Date(l.recordedAt);
          return logDate.toISOString().startsWith(dateStr);
        });
        return { success: true, data: filtered, isOffline: true };
      }
      return { success: true, data: mockFoodLogs, isOffline: true };
    }
    console.error("Error fetching logs:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลประวัติการกินได้" };
  }
}

/**
 * ลบข้อมูลการกิน
 */
export async function deleteFoodLog(id: string) {
  try {
    if (shouldBypassDb()) {
      throw new Error('Database is flagged offline (Circuit Breaker)');
    }

    await prisma.foodLog.delete({
      where: { id: id },
    });
    
    isDbOffline = false;
    revalidatePath('/dashboard');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (checkIsConnectionError(error)) {
      isDbOffline = true;
      lastDbErrorTime = Date.now();
      mockFoodLogs = mockFoodLogs.filter(log => log.id !== id);
      revalidatePath('/dashboard');
      revalidatePath('/');
      return { success: true, isOffline: true };
    }
    console.error("Error deleting log:", error);
    return { success: false, error: "ไม่สามารถลบข้อมูลได้" };
  }
}