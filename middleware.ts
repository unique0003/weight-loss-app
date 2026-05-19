// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ฟังก์ชันนี้จะทำงานทุกครั้งที่มีการเปลี่ยนหน้าเว็บ
export function middleware(request: NextRequest) {
  // ตอนนี้ให้ปล่อยผ่านไปก่อน เดี๋ยวเราค่อยมาเขียนเช็ค Login ทีหลังครับ
  return NextResponse.next();
}

// ตั้งค่าให้ Middleware ทำงานกับทุกหน้า ยกเว้นไฟล์รูปภาพและ API ภายในระบบ
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};