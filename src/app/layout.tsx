import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "場地租借預約",
  description: "查看場地可租時段並送出預約申請。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
