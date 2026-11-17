import { NextResponse } from "next/server";
import { getCalendarBusy, taipeiDateTime } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, startHour, duration, customerName, email, phone, note = "" } = body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(startHour) || !Number.isInteger(duration) || startHour < 11 || startHour >= 24 || duration < 1 || startHour + duration > 24) {
      return NextResponse.json({ error: "預約時段格式錯誤（每日 11:00–24:00，每小時為單位）" }, { status: 400 });
    }
    if (typeof customerName !== "string" || !customerName.trim() || typeof email !== "string" || !email.includes("@") || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ error: "請填寫姓名、有效 Email 與聯絡電話" }, { status: 400 });
    }
    if (typeof note !== "string" || note.length > 1000) return NextResponse.json({ error: "備註最多 1000 字" }, { status: 400 });
    const startAt = taipeiDateTime(date, startHour);
    const endAt = taipeiDateTime(date, startHour + duration);
    const [busy, existing] = await Promise.all([
      getCalendarBusy(date),
      prisma.booking.findMany({ where: { startAt: { lt: endAt }, endAt: { gt: startAt }, status: { not: "REJECTED" } }, select: { startAt: true, endAt: true } }),
    ]);
    if ([...busy, ...existing].some((period) => overlaps(startAt, endAt, period.start, period.end))) {
      return NextResponse.json({ error: "此時段剛被預約，請重新選擇" }, { status: 409 });
    }
    const booking = await prisma.booking.create({ data: { customerName: customerName.trim(), email: email.trim(), phone: phone.trim(), startAt, endAt, note: note.trim() }, select: { id: true, status: true } });
    return NextResponse.json({ booking, message: "已送出預約申請，待場地方確認；確認後請依通知匯款，款項人工確認成功後才成立。" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "送出失敗，請稍後再試" }, { status: 500 });
  }
}
