import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GUEST_COOKIE_NAME = 'weight_loss_guest_id';

export function middleware(request: NextRequest) {
  // สร้าง Response ถัดไป
  const response = NextResponse.next();
  
  // ตรวจสอบว่ามี Guest Cookie หรือไม่
  let guestId = request.cookies.get(GUEST_COOKIE_NAME)?.value;
  
  // ถ้ายังไม่มี (เข้ามาครั้งแรก) ให้สร้างและเซ็ตลงใน Response
  if (!guestId) {
    guestId = crypto.randomUUID();
    response.cookies.set(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 ปี
    });
  }

  return response;
}

// ระบุ Path ที่ต้องการให้ Middleware ทำงาน
export const config = {
  matcher: [
    /*
     * รันในทุกหน้า ยกเว้น:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
