import { NextResponse } from "next/server";
import { getCalendarBusy, taipeiDateTime, type Room } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const room = params.get("room") as Room | null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["A", "F"].includes(room ?? "")) return NextResponse.json({ error: "日期或教室格式錯誤" }, { status: 400 });
  try {
    const busy = await getCalendarBusy(date, room!);
    const bookings = await prisma.booking.findMany({
      where: { room: room!, startAt: { lt: taipeiDateTime(date, 1440) }, endAt: { gt: taipeiDateTime(date, 0) }, status: { notIn: ["REJECTED", "CANCELLED"] } },
      select: { startAt: true, endAt: true },
    });
    const slots = [];
    for (let minutes = 660; minutes < 1440; minutes += 30) {
      const start = taipeiDateTime(date, minutes);
      const end = taipeiDateTime(date, minutes + 30);
      const isBusy = [...busy, ...bookings].some((period) => overlaps(start, end, period.start, period.end));
      const format = (value: number) => value === 1440 ? "24:00" : `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
      slots.push({ start: format(minutes), end: format(minutes + 30), startMinutes: minutes, available: !isBusy });
    }
    return NextResponse.json({ date, room, timezone: "Asia/Taipei", slots });
  } catch {
    return NextResponse.json({ error: "無法取得目前可預約時段，請稍後再試" }, { status: 503 });
  }
}
