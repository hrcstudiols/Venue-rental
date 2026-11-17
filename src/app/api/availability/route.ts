import { NextResponse } from "next/server";
import { getCalendarBusy, taipeiDateTime } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "日期格式錯誤" }, { status: 400 });
  try {
    const busy = await getCalendarBusy(date);
    const bookings = await prisma.booking.findMany({
      where: { startAt: { lt: taipeiDateTime(date, 24) }, endAt: { gt: taipeiDateTime(date, 0) }, status: { not: "REJECTED" } },
      select: { startAt: true, endAt: true },
    });
    const slots = [];
    for (let hour = 11; hour < 24; hour++) {
      const start = taipeiDateTime(date, hour);
      const end = taipeiDateTime(date, hour + 1);
      const isBusy = [...busy, ...bookings].some((period) => overlaps(start, end, period.start, period.end));
      slots.push({ start: `${String(hour).padStart(2, "0")}:00`, end: hour === 23 ? "24:00" : `${String(hour + 1).padStart(2, "0")}:00`, available: !isBusy });
    }
    return NextResponse.json({ date, timezone: "Asia/Taipei", slots });
  } catch {
    return NextResponse.json({ error: "無法取得目前可預約時段，請稍後再試" }, { status: 503 });
  }
}
