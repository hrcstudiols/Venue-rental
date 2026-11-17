import { google } from "googleapis";

const timezone = "Asia/Taipei";
export type Room = "A" | "F";

function calendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const auth = new google.auth.JWT({ email, key: rawKey.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/calendar"] });
  return google.calendar({ version: "v3", auth });
}

function calendarId(room: Room) {
  return room === "A"
    ? process.env.GOOGLE_CALENDAR_ID_A || process.env.GOOGLE_CALENDAR_ID
    : process.env.GOOGLE_CALENDAR_ID_F || process.env.GOOGLE_CALENDAR_ID;
}

export function taipeiDateTime(date: string, minutes: number) {
  const dayOffset = Math.floor(minutes / 1440);
  const withinDay = minutes % 1440;
  const day = new Date(`${date}T00:00:00+08:00`);
  day.setUTCDate(day.getUTCDate() + dayOffset);
  day.setUTCHours(Math.floor(withinDay / 60), withinDay % 60, 0, 0);
  return day;
}

export async function getCalendarBusy(date: string, room: Room): Promise<Array<{ start: Date; end: Date }>> {
  const client = calendarClient();
  const id = calendarId(room);
  if (!client || !id) return [];
  const result = await client.freebusy.query({
    requestBody: { timeMin: taipeiDateTime(date, 0).toISOString(), timeMax: taipeiDateTime(date, 1440).toISOString(), timeZone: timezone, items: [{ id }] },
  });
  return (result.data.calendars?.[id]?.busy ?? []).map((period) => ({ start: new Date(period.start!), end: new Date(period.end!) }));
}

export async function createCalendarEvent(booking: {
  id: string; room: Room; customerName: string; phone: string; email: string; startAt: Date; endAt: Date; note: string; totalPrice: number;
}): Promise<string | null> {
  const client = calendarClient();
  const id = calendarId(booking.room);
  if (!client || !id) return null;
  const result = await client.events.insert({
    calendarId: id,
    requestBody: {
      summary: `HRC龍山訓練基地｜${booking.room}教室｜${booking.customerName}`,
      description: `預約編號：${booking.id}\n教室：${booking.room}教室\n金額：NT$${booking.totalPrice}\n聯絡電話：${booking.phone}\nEmail：${booking.email}\n備註：${booking.note}`,
      start: { dateTime: booking.startAt.toISOString(), timeZone: timezone },
      end: { dateTime: booking.endAt.toISOString(), timeZone: timezone },
    },
  });
  return result.data.id ?? null;
}
