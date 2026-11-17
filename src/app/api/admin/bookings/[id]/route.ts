import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createCalendarEvent } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const { id } = await context.params;
  try {
    const { action } = await request.json();
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: "找不到預約" }, { status: 404 });
    if (action === "approve" && booking.status === "PENDING_REVIEW") {
      const updated = await prisma.booking.update({ where: { id }, data: { status: "AWAITING_PAYMENT" } });
      return NextResponse.json({ booking: updated, message: "已確認預約申請，請通知客人匯款。" });
    }
    if (action === "confirm-payment" && booking.status === "AWAITING_PAYMENT") {
      const calendarEventId = await createCalendarEvent(booking);
      const updated = await prisma.booking.update({ where: { id }, data: { status: "CONFIRMED", calendarEventId } });
      return NextResponse.json({ booking: updated, calendarSynced: Boolean(calendarEventId), message: "款項已人工確認，預約成立。" });
    }
    if (action === "reject" && ["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(booking.status)) {
      const updated = await prisma.booking.update({ where: { id }, data: { status: "REJECTED" } });
      return NextResponse.json({ booking: updated });
    }
    return NextResponse.json({ error: "此預約目前不能執行該操作" }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "更新預約失敗；請檢查日曆設定後重試" }, { status: 500 });
  }
}
