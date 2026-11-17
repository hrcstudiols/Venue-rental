import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createCalendarEvent, type Room } from "@/lib/google-calendar";
import { cancellationRefund, bookingPrice } from "@/lib/pricing";
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
    if (action === "approve-teacher" && booking.requestedHrcTeacher && !booking.hrcTeacherApproved && booking.status === "PENDING_REVIEW") {
      const totalPrice = bookingPrice(booking.room as Room, true, booking.startAt, booking.endAt);
      return NextResponse.json({ booking: await prisma.booking.update({ where: { id }, data: { hrcTeacherApproved: true, totalPrice } }) });
    }
    if (action === "decline-teacher" && booking.requestedHrcTeacher && !booking.hrcTeacherApproved && booking.status === "PENDING_REVIEW") {
      return NextResponse.json({ booking: await prisma.booking.update({ where: { id }, data: { requestedHrcTeacher: false } }) });
    }
    if (action === "approve" && booking.status === "PENDING_REVIEW") {
      if (booking.requestedHrcTeacher && !booking.hrcTeacherApproved) return NextResponse.json({ error: "請先核准或拒絕 HRC 老師優惠申請" }, { status: 409 });
      const now = new Date();
      const updated = await prisma.booking.update({ where: { id }, data: { status: "AWAITING_PAYMENT", paymentDueAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) } });
      return NextResponse.json({ booking: updated, message: "已確認預約時段；請於 5 日內完成匯款。" });
    }
    if (action === "confirm-payment" && booking.status === "AWAITING_PAYMENT") {
      const calendarEventId = await createCalendarEvent(booking as typeof booking & { room: Room });
      const updated = await prisma.booking.update({ where: { id }, data: { status: "CONFIRMED", calendarEventId } });
      return NextResponse.json({ booking: updated, calendarSynced: Boolean(calendarEventId), message: "款項已人工確認，預約成立。" });
    }
    if (action === "reject" && ["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(booking.status)) {
      return NextResponse.json({ booking: await prisma.booking.update({ where: { id }, data: { status: "REJECTED" } }) });
    }
    if (action === "process-cancellation" && booking.status === "CONFIRMED" && booking.cancellationRequestedAt) {
      const refundAmount = cancellationRefund(booking.totalPrice, booking.startAt, booking.cancellationRequestedAt);
      return NextResponse.json({ booking: await prisma.booking.update({ where: { id }, data: { status: "CANCELLED", refundAmount } }), refundAmount });
    }
    return NextResponse.json({ error: "此預約目前不能執行該操作" }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "更新預約失敗；請檢查日曆設定後重試" }, { status: 500 });
  }
}
