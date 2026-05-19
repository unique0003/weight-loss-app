<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Standards (AGENTS.md)

## 1. Tech Stack & Tools
- Framework: Next.js (App Router), React
- Styling: Tailwind CSS
- Database: Prisma, PostgreSQL, Supabase
- Icons: lucide-react

## 2. Design System & UI Theme
- สไตล์งาน: Modern Professional, Electronic Tech
- โทนสีหลัก: พื้นหลังสีดำเข้ม (#0a0a0a, #111) ตัดด้วยไฮไลท์ สีส้ม (Orange-500) และ สีเหลือง
- ส่วนประกอบ UI: เน้นความโค้งมน (rounded-xl, rounded-2xl), มีเงาแบบเรืองแสง (Glow effect), และใช้เส้นขอบ (border-gray-800) ให้ดูเป็นมิติแบบล้ำยุค

## 3. Coding Rules
- ใช้ TypeScript อย่างเคร่งครัด พยายามหลีกเลี่ยงการใช้ `any`
- เขียนโค้ดแบบฝั่ง Server Action (`'use server'`) สำหรับการดึง/บันทึกข้อมูลเข้า Database เสมอ
- การจัดการ Error: ห้ามพ่นโค้ด Error ยาวๆ ออกหน้า Terminal ให้ `console.error` เป็นข้อความสั้นๆ และส่ง Error Message กลับไปแสดงผลที่หน้า UI เสมอ

## 4. File Structure Rule
- ไฟล์ Component ที่มี UI ให้เก็บไว้ใน `src/components/features/`
- ไฟล์ที่ใช้ติดต่อ Database (Server Actions) ให้เก็บไว้ใน `src/actions/`