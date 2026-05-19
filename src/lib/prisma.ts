// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// สร้าง Singleton instance สำหรับ Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // เปิด log เพื่อดู SQL Command ใน Terminal ได้ (เอาออกได้ตอนขึ้น Production)
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;