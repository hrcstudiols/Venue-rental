import { NextResponse } from "next/server";
import { cancellationRefund } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true, room: true, startAt: true, endAt: true, status: true, requestedHrcTeacher: true, hrcTeacherApproved: true, totalPrice: true, paymentDueAt: true, paymentReportedAt: true, cancellationRequestedAt: true, refundAmount: true, createdAt: true } });
  if (!booking) return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  const cancellationRefundEstimate = booking.status === "CONFIRMED" ? cancellationRefund(booking.totalPrice, booking.startAt, new Date()) : null;
  return NextResponse.json({ booking, cancellationRefundEstimate });
}

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const { action } = await request.json().catch(() => ({ action: "payment" }));
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true, status: true, paymentReportedAt: true, cancellationRequestedAt: true } });
  if (!booking) return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  if (action === "cancel") {
    const full = await prisma.booking.findUnique({ where: { id }, select: { startAt: true } });
    if (booking.status !== "CONFIRMED" || !full || full.startAt <= new Date()) return NextResponse.json({ error: "此預約目前無法提出取消申請" }, { status: 409 });
    const updated = await prisma.booking.update({ where: { id }, data: { cancellationRequestedAt: booking.cancellationRequestedAt ?? new Date() }, select: { id: true, status: true, cancellationRequestedAt: true } });
    return NextResponse.json({ booking: updated, message: "已送出取消申請；退款金額依申請時間及取消規則核算，待場地方處理。" });
  }
  if (booking.status !== "AWAITING_PAYMENT") return NextResponse.json({ error: "目前不在待付款狀態" }, { status: 409 });
  const updated = await prisma.booking.update({ where: { id }, data: { paymentReportedAt: new Date() }, select: { id: true, status: true, paymentReportedAt: true } });
  return NextResponse.json({ booking: updated, message: "已通知場地方，待人工核對入帳。" });
}
