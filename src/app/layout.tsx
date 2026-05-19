// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weight Loss Calculator",
  description: "System Calculator for BMI and Calories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* เพิ่ม suppressHydrationWarning ตรงนี้ครับ */}
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
