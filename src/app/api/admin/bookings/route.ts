import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "未授權" }, { status: 401 });
  try {
    const bookings = await prisma.booking.findMany({ orderBy: [{ createdAt: "desc" }], take: 200 });
    return NextResponse.json({ bookings });
  } catch {
    return NextResponse.json({ error: "無法載入預約資料" }, { status: 500 });
  }
}
