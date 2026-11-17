import { google } from "googleapis";

const timezone = "Asia/Taipei";

function calendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey || !process.env.GOOGLE_CALENDAR_ID) return null;
  const auth = new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

export function taipeiDateTime(date: string, hour: number) {
  const day = hour === 24 ? new Date(`${date}T00:00:00+08:00`) : new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+08:00`);
  if (hour === 24) day.setUTCDate(day.getUTCDate() + 1);
  return day;
}

export async function getCalendarBusy(date: string): Promise<Array<{ start: Date; end: Date }>> {
  const client = calendarClient();
  if (!client) return [];
  const start = taipeiDateTime(date, 0);
  const end = taipeiDateTime(date, 24);
  const result = await client.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: timezone,
      items: [{ id: process.env.GOOGLE_CALENDAR_ID! }],
    },
  });
  return (result.data.calendars?.[process.env.GOOGLE_CALENDAR_ID!]?.busy ?? []).map((period) => ({
    start: new Date(period.start!),
    end: new Date(period.end!),
  }));
}

export async function createCalendarEvent(booking: {
  id: string; customerName: string; phone: string; email: string; startAt: Date; endAt: Date; note: string;
}): Promise<string | null> {
  const client = calendarClient();
  if (!client) return null;
  const result = await client.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    requestBody: {
      summary: `場地租借 - ${booking.customerName}`,
      description: `預約編號：${booking.id}\n聯絡電話：${booking.phone}\nEmail：${booking.email}\n備註：${booking.note}`,
      start: { dateTime: booking.startAt.toISOString(), timeZone: timezone },
      end: { dateTime: booking.endAt.toISOString(), timeZone: timezone },
    },
  });
  return result.data.id ?? null;
}
