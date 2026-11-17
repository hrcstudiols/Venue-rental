import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true, startAt: true, endAt: true, status: true, paymentReportedAt: true, createdAt: true } });
  if (!booking) return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!booking) return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  if (booking.status !== "AWAITING_PAYMENT") return NextResponse.json({ error: "目前不在待付款狀態" }, { status: 409 });
  const updated = await prisma.booking.update({ where: { id }, data: { paymentReportedAt: new Date() }, select: { id: true, status: true, paymentReportedAt: true } });
  return NextResponse.json({ booking: updated, message: "已通知場地方，待人工核對入帳。" });
}
