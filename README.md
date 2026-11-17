# HRC龍山訓練基地租借網站

Next.js App Router reservation site with Taipei-time availability (daily 11:00–24:00, half-hour increments), A/F rooms, teacher pricing subject to admin verification, bank-transfer payment, cancellation/refund requests, and Google Calendar integration.

## Pricing

| Customer | A 教室 | F 教室 |
| --- | ---: | ---: |
| 一般民眾 | NT$700/hour | NT$800/hour |
| HRC 老師（管理員核准後） | NT$450/hour | NT$550/hour |

Half-hour bookings cost half the hourly rate. The customer requests the teacher rate on the booking form; an administrator must approve or decline this before approving the booking. If declined, regular pricing applies.

## Local development

Requirements: Node.js 20.9+, npm, and PostgreSQL. Configure `.env` using `.env.example`, install dependencies, run `npx prisma migrate deploy`, then `npm run dev`. Home: `/`; admin: `/admin`.

## Booking and payment flow

1. Customer selects room, date, contiguous half-hour slots, and enters contact details.
2. Admin reviews the request and, if requested, verifies HRC teacher status. Then approve or reject the booking.
3. Approval starts a five-day bank transfer window. The status page displays 玉山銀行（808）／0875979137790 and the due date.
4. Customer may report that a transfer was made. This is not payment verification; the admin checks the actual bank transaction and confirms receipt in `/admin`.
5. Confirmed bookings are added to Google Calendar if calendar credentials are configured.

The five-day payment deadline is displayed and recorded. Automatic expiration/release is not enabled; an admin must reject an unpaid booking if the deadline passes.

## Cancellation and refunds

The customer can request cancellation from the private booking status page before the booking begins. The refund is based on the time the request was submitted: at least 24 hours before start, 100%; from 12 to under 24 hours, 70%; under 12 hours or no-show, 0%. The admin manually processes the cancellation and refund; the site does not initiate a bank refund. For no-shows, the admin should handle the booking manually.

## Google Calendar

Enable Google Calendar API and share the calendars with the service account as editor. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, then either separate `GOOGLE_CALENDAR_ID_A` and `GOOGLE_CALENDAR_ID_F`, or one shared `GOOGLE_CALENDAR_ID` fallback. Separate calendars are recommended so each room has independent availability. Configure credentials in Vercel Environment Variables, not in source control. The original personal agenda URL alone does not grant API access.

## Deploy to Vercel

Use a managed PostgreSQL provider and import this repository into Vercel. Set `DATABASE_URL` (PostgreSQL connection string) and a long random `ADMIN_TOKEN`; optionally configure Google Calendar variables. The committed migration adds room, pricing, teacher approval, payment deadline and cancellation data. `npm run build` applies migrations and builds the app. Vercel runs in Hong Kong (`hkg1`).

SQLite is not suitable for Vercel's ephemeral filesystem. Never commit `.env` or credentials.
