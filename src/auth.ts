// src/auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import Line from "next-auth/providers/line"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

const GUEST_COOKIE_NAME = 'weight_loss_guest_id';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    Line({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // User is available during sign-in
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      try {
        const cookieStore = await cookies();
        const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

        // ถ้ามี Guest ID และ User มี ID (เพิ่งล็อคอินสำเร็จ)
        // ให้โอนย้ายข้อมูลจาก Guest ID มายัง User ID
        if (guestId && user.id) {
          console.log(`[Auth Event] Merging data from Guest (${guestId}) to User (${user.id})`);
          
          await prisma.$transaction([
            prisma.foodLog.updateMany({
              where: { userId: guestId },
              data: { userId: user.id },
            }),
            prisma.weightLog.updateMany({
              where: { userId: guestId },
              data: { userId: user.id },
            })
          ]);

          // เคลียร์ Cookie ทิ้งหลังจากการผูกบัญชีเสร็จสิ้น
          cookieStore.delete(GUEST_COOKIE_NAME);
        }
      } catch (error) {
        console.error("[Auth Event Error] Failed to merge guest data:", error);
      }
    }
  },
  pages: {
    signIn: '/', // จะใช้ Modal ทับหน้า Dashboard
  },
})
