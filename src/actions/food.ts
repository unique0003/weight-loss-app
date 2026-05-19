// src/actions/food.ts
'use server';

import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function analyzeAndSaveFoodLog(
  userId: string, 
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK', 
  base64Image: string,
  additionalInfo?: { name?: string; ingredients?: string; portion?: string } // ✨ เพิ่มพารามิเตอร์รับข้อมูลเสริม
) {
  try {
    console.log("--- 1. เริ่มระบบสกัดรูปภาพ ---");
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.split(';')[0].split(':')[1];

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // ใช้โมเดลล่าสุดตามที่อัปเดต
      generationConfig: {
        responseMimeType: "application/json", 
      }
    });

    // 🎯 โครงสร้างคำสั่งหลัก
    let prompt = `คุณคือนักโภชนาการ วิเคราะห์รูปภาพอาหารนี้ให้หน่อย บอกชื่ออาหารภาษาไทยและประเมินแคลอรีรวมให้แม่นยำที่สุด 
    ตอบกลับมาเป็น JSON Format เท่านั้น รูปแบบคือ: {"foodName": "ชื่ออาหาร", "calories": ตัวเลขแคลอรี}`;

    // 🎯 ถ้าผู้ใช้กรอกข้อมูลเสริมมา ให้เอาไปต่อท้ายคำสั่งเพื่อให้ AI อ่านประกอบกัน
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
    const estimatedCalories = Number(parsedData.calories); 
    const foodName = parsedData.foodName;

    console.log("--- 3. กำลังบันทึกข้อมูลลง Database ---");
    const newFoodLog = await prisma.foodLog.create({
      data: {
        userId: userId,
        mealType: mealType,
        foodName: foodName,
        calories: estimatedCalories,
      }
    });

    console.log("🎉 บันทึกสำเร็จเรียบร้อย!");
    revalidatePath('/dashboard');

    return { success: true, data: newFoodLog };

  } catch (error: any) {
    console.error("🔥 สาเหตุที่แท้จริงที่ทำให้ Error:", error?.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
    return { success: false, error: error?.message || "ไม่สามารถวิเคราะห์รูปภาพอาหารได้ กรุณาลองใหม่อีกครั้ง" };
  }
}
// ------------------------------------------------------------------
// 2. ฟังก์ชันสำหรับดึงข้อมูลประวัติการกินมาโชว์ที่หน้า Dashboard (ฟังก์ชันใหม่)
// ------------------------------------------------------------------
export async function getFoodLogs(userId: string) {
  try {
    const logs = await prisma.foodLog.findMany({
      where: { userId: userId },
      orderBy: { recordedAt: 'desc' }, // เรียงจากรายการล่าสุดขึ้นก่อน
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error("Error fetching logs:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลประวัติการกินได้" };
  }
}
// ------------------------------------------------------------------
// 3. ฟังก์ชันสำหรับลบข้อมูลการกิน (ฟังก์ชันใหม่)
// ------------------------------------------------------------------
export async function deleteFoodLog(id: string) {
  try {
    await prisma.foodLog.delete({
      where: { id: id },
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting log:", error);
    return { success: false, error: "ไม่สามารถลบข้อมูลได้" };
  }
}