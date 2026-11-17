import { NextResponse } from "next/server";
import { getCalendarBusy, taipeiDateTime, type Room } from "@/lib/google-calendar";
import { bookingPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, startMinutes, durationUnits, room, customerName, email, phone, note = "", requestedHrcTeacher = false } = body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["A", "F"].includes(room) || !Number.isInteger(startMinutes) || startMinutes < 660 || startMinutes >= 1440 || startMinutes % 30 !== 0 || !Number.isInteger(durationUnits) || durationUnits < 1 || startMinutes + durationUnits * 30 > 1440) {
      return NextResponse.json({ error: "預約時段格式錯誤（每日 11:00–24:00，每半小時為單位）" }, { status: 400 });
    }
    if (typeof customerName !== "string" || !customerName.trim() || typeof email !== "string" || !email.includes("@") || typeof phone !== "string" || !phone.trim()) return NextResponse.json({ error: "請填寫姓名、有效 Email 與聯絡電話" }, { status: 400 });
    if (typeof requestedHrcTeacher !== "boolean") return NextResponse.json({ error: "HRC 老師身份欄位錯誤" }, { status: 400 });
    if (typeof note !== "string" || note.length > 1000) return NextResponse.json({ error: "備註最多 1000 字" }, { status: 400 });
    const startAt = taipeiDateTime(date, startMinutes);
    const endAt = taipeiDateTime(date, startMinutes + durationUnits * 30);
    const [busy, existing] = await Promise.all([
      getCalendarBusy(date, room as Room),
      prisma.booking.findMany({ where: { room, startAt: { lt: endAt }, endAt: { gt: startAt }, status: { notIn: ["REJECTED", "CANCELLED"] } }, select: { startAt: true, endAt: true } }),
    ]);
    if ([...busy, ...existing].some((period) => overlaps(startAt, endAt, period.start, period.end))) return NextResponse.json({ error: "此教室時段剛被預約，請重新選擇" }, { status: 409 });
    const totalPrice = bookingPrice(room as Room, false, startAt, endAt);
    const booking = await prisma.booking.create({
      data: { customerName: customerName.trim(), email: email.trim(), phone: phone.trim(), room, startAt, endAt, note: note.trim(), requestedHrcTeacher, totalPrice },
      select: { id: true, status: true },
    });
    return NextResponse.json({ booking, message: "已送出預約申請，待場地方確認。HRC 老師優惠須經管理員核實；確認後請於 5 日內匯款。" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "送出失敗，請稍後再試" }, { status: 500 });
  }
}
