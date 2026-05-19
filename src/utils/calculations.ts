// src/utils/calculations.ts

/**
 * คำนวณค่า BMI (ดัชนีมวลกาย)
 * สูตร: น้ำหนัก (kg) / ส่วนสูง (m)^2
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  // ปัดเศษทศนิยม 2 ตำแหน่ง
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

/**
 * ประเมินเกณฑ์ BMI (อ้างอิงตามมาตรฐานเอเชีย)
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'น้ำหนักต่ำกว่าเกณฑ์';
  if (bmi <= 22.9) return 'น้ำหนักปกติ';
  if (bmi <= 24.9) return 'น้ำหนักเกิน (ท้วม)';
  return 'โรคอ้วน';
}

/**
 * คำนวณ BMR (Basal Metabolic Rate) - พลังงานที่ใช้ต่อวันขณะพัก
 * ใช้สูตร Mifflin-St Jeor
 */
export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: 'MALE' | 'FEMALE' | 'OTHER'): number {
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  
  if (gender === 'MALE') {
    bmr += 5;
  } else {
    // สำหรับผู้หญิง (และตั้งค่า OTHER ให้ใช้สูตรผู้หญิงเพื่อความปลอดภัยในการลดน้ำหนัก)
    bmr -= 161;
  }
  
  return Math.round(bmr);
}

/**
 * คำนวณเป้าหมายแคลอรีต่อวันและต่อมื้อ สำหรับ "ลดน้ำหนัก"
 * @param bmr ค่า BMR ที่คำนวณได้
 * @param activityMultiplier ระดับกิจกรรม (Default: 1.2 นั่งทำงานเป็นหลัก ไม่ออกกำลังกาย)
 * @param calorieDeficit จำนวนแคลอรีที่ต้องการตัดออกเพื่อลดน้ำหนัก (Default: ตัดออก 500 kcal)
 */
export function calculateCalorieGoal(bmr: number, activityMultiplier: number = 1.2, calorieDeficit: number = 500) {
  // TDEE (Total Daily Energy Expenditure)
  const maintainCalories = Math.round(bmr * activityMultiplier);
  
  // หักลบแคลอรีเพื่อลดน้ำหนัก
  let targetCalories = maintainCalories - calorieDeficit;

  // เซฟตี้: ไม่ควรกินน้อยเกินไป (กำหนดขั้นต่ำไว้ที่ 1,200 kcal ต่อวัน ป้องกันระบบเผาผลาญพัง)
  if (targetCalories < 1200) {
    targetCalories = 1200;
  }

  return {
    tdee: maintainCalories,         // แคลอรีรักษาน้ำหนัก
    targetDaily: targetCalories,    // **แคลอรีเป้าหมายที่ควรกินต่อวัน**
    targetPerMeal: Math.round(targetCalories / 3) // **แคลอรีที่ควรกินต่อมื้อ (หาร 3)**
  };
}