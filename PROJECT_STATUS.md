# สถานะการพัฒนาโปรเจกต์ (Project Status)

เอกสารนี้รวบรวมโครงสร้างและฟีเจอร์ทั้งหมดที่ได้รับการพัฒนาแล้วในโปรเจกต์ **AI Calorie & Weight Loss App**

## 1. 🛠 Tech Stack & โครงสร้างพื้นฐาน
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS (Dark Mode, Glow Effect, Glassmorphism)
- **Database ORM:** Prisma
- **Database Provider:** PostgreSQL (Supabase)
- **AI Integration:** Google Gemini 2.5 Flash
- **Authentication:** NextAuth.js v5 (Auth.js)

## 2. 🔐 ระบบผู้ใช้งานและ Authentication
- [x] **ระบบ Guest Mode (ใช้ก่อน ค่อยล็อคอินทีหลัง):** 
  - สร้าง UUID ชั่วคราวเก็บลง HttpOnly Cookie (`src/lib/guest.ts`)
  - ทำให้ผู้ใช้สามารถใช้งานฟังก์ชันแอปได้เต็มรูปแบบโดยไม่ต้องสมัครสมาชิกก่อน
- [x] **ระบบเข้าสู่ระบบด้วย Social Login:** 
  - รองรับการล็อคอินผ่าน Google, Facebook, และ LINE (`src/auth.ts`, `src/components/features/LoginModal.tsx`)
- [x] **ระบบโอนย้ายข้อมูลอัจฉริยะ (Data Merging):** 
  - เมื่อ Guest เลือกล็อคอิน ข้อมูลที่บันทึกไว้ใน Guest ID จะถูกโอนย้ายเข้าบัญชีที่ล็อคอินอัตโนมัติ 
- [x] **ระบบแสดงผลตามสถานะการล็อคอิน:** 
  - มีแบนเนอร์แจ้งเตือนให้ล็อคอินเพื่อบันทึกข้อมูลสำหรับโหมด Guest (`src/components/features/DashboardUI.tsx`)
- [x] **ระบบล้างแคช Client Router Cache อัตโนมัติ (Auth State Sync):** 
  - ซิงค์สถานะระหว่าง Client และ Server Component ผ่าน `useSession` และสั่ง `router.refresh()` อัตโนมัติเมื่อตรวจพบการเปลี่ยนแปลงสถานะ ป้องกันการติดแคชหน้าแดชบอร์ดหลังจากการเข้ารหัสหรือออกระบบ
- [x] **ระบบป้องกันหน้ารวน/ค้างเมื่อผู้ใช้กดย้อนกลับ (BFcache / History Reload):** 
  - ตรวจจับทิศทางการเดินเรือย้อนกลับ (Back-Forward navigation) ของเบราว์เซอร์ผ่าน `PageTransitionEvent` และ Navigation Timing API เพื่อสั่งรีโหลดหน้าเพจอย่างปลอดภัย ช่วยรีเซ็ตสถานะปุ่มและดึง CSRF Token ชุดใหม่ ทำให้ปุ่มล็อกอินกดใช้งานซ้ำได้ทันที
- [x] **ระบบแยกหน้าต่างลงทะเบียน & เข้าสู่ระบบใน UI:** 
  - เพิ่มแท็บสำหรับเลือกระหว่าง "เข้าสู่ระบบ" และ "สมัครสมาชิก" ในหน้าต่าง Modal พร้อมปรับเนื้อหาแบบไดนามิก และแก้ปัญหาฟอนต์ไทยตัดคำล้นขอบกล่องด้วยคลาส `break-words` และเทคนิคการเคาะคำอ่านภาษาไทยแบบสากล

## 3. 🎯 ระบบคำนวณและโปรไฟล์สุขภาพ
- [x] **BMI & BMR Calculator:** 
  - คำนวณดัชนีมวลกาย, อัตราการเผาผลาญพื้นฐาน (BMR), TDEE (`src/components/features/BmiCalculatorForm.tsx`, `src/utils/calculations.ts`)
  - แนะนำเป้าหมายแคลอรี่รายวันและรายมื้อที่เหมาะสมอัตโนมัติ
- [x] **Profile Management:** 
  - บันทึกส่วนสูง, เพศ, อายุ เข้าสู่ฐานข้อมูล และสามารถอัปเดตได้จาก Dashboard

## 4. 📸 ระบบวิเคราะห์อาหารด้วย AI (AI Food Scanner)
- [x] **Image Processing:** 
  - ระบบอัปโหลดรูปภาพอาหารและบีบอัดเป็น Base64 (`src/components/features/FoodImageUploader.tsx`)
- [x] **Gemini Vision Integration:** 
  - ส่งรูปภาพให้ Gemini 2.5 Flash วิเคราะห์ชื่ออาหารและประมาณการแคลอรี่แบบ JSON (`src/actions/food.ts`)
- [x] **Meal Categories:** 
  - จัดการมื้ออาหาร (เช้า, เที่ยง, เย็น, ว่าง)

## 5. 📊 แดชบอร์ดและสถิติ (Dashboard & Charts)
- [x] **Modern UI:** 
  - ออกแบบแดชบอร์ดให้ดูทันสมัย เข้าใจง่าย แสดงข้อมูลวันนี้แบบสรุปรวม (Summary Card)
- [x] **Interactive Calorie Chart:** 
  - กราฟแท่งแสดงแคลอรี่ที่โต้ตอบได้ (`src/components/features/CalorieChart.tsx`)
  - สลับมุมมองได้ 4 ระดับ: วัน (Day), สัปดาห์ (Week), เดือน (Month), ปี (Year)
  - สามารถคลิกเจาะลึก (Drill-down) จากดูเป็นปี เลื่อนลงไปดูรายเดือนหรือสัปดาห์ได้
- [x] **Weight Trend Line Chart:** 
  - กราฟเส้นแสดงแนวโน้มน้ำหนักล่าสุด 7 ครั้ง

## 6. 🛡 ระบบความเสถียร (Resilience System)
- [x] **Circuit Breaker & Mock Fallback:** 
  - หากฐานข้อมูล (Supabase) มีปัญหาการเชื่อมต่อ (เช่น Max Connections Reached หรือโดนระงับชั่วคราว) ระบบจะตัดเข้าสู่โหมดจำลอง (Mock Data) อัตโนมัติ เพื่อให้ผู้ใช้ยังคงใช้งานแอป (UI & AI Scanner) ได้อย่างราบรื่นโดยไม่แครช (`src/actions/food.ts`, `src/actions/user.ts`)

---

## 📂 โครงสร้างโฟลเดอร์หลัก (Directory Structure)
```text
/src
 ├── /actions            # Server Actions (ติดต่อ Database & AI)
 │   ├── food.ts         # จัดการข้อมูลอาหาร และ Gemini AI
 │   └── user.ts         # จัดการข้อมูลผู้ใช้, น้ำหนัก, และ Offline Mode
 ├── /app                # Next.js App Router (Pages & Layout)
 │   ├── (dashboard)     # หน้าแดชบอร์ด
 │   ├── api/auth        # Route สำหรับ NextAuth
 │   ├── layout.tsx      # โครงสร้างหลัก
 │   └── page.tsx        # หน้า Landing Page & BMI
 ├── /auth.ts            # การตั้งค่า NextAuth.js
 ├── /components
 │   └── /features       # UI Components หลัก
 │       ├── BmiCalculatorForm.tsx
 │       ├── CalorieChart.tsx
 │       ├── DashboardUI.tsx
 │       ├── FoodImageUploader.tsx
 │       └── LoginModal.tsx
 ├── /lib                # Utility libraries และเครื่องมือ
 │   ├── auth-util.ts    # ดึง UserId (ทั้ง Guest และ Authenticated)
 │   ├── guest.ts        # จัดการ Cookie สำหรับ Guest
 │   └── prisma.ts       # การเชื่อมต่อ Prisma Client
 └── /utils
     └── calculations.ts # สูตรคำนวณ BMI, BMR
```
