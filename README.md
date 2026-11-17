# 場地租借網站

Next.js App Router starter for Taipei-time bookings. Guests can see hourly availability (11:00–24:00) and submit a request. The operator reviews it, asks the guest to transfer, and manually confirms receipt; only then does the booking become confirmed and get added to Google Calendar.

## Run locally

1. Install Node.js 20.9 or later.
2. Copy `.env.example` to `.env` and set `ADMIN_TOKEN` to a long random secret.
3. Install dependencies and initialize the local database:

   ```bash
   npm install
   npx prisma db push
   npm run dev
   ```

4. Open http://localhost:3000.

The local database uses SQLite. For deployment, use a persistent database supported by Prisma and update `DATABASE_URL`/the Prisma datasource accordingly; do not use ephemeral server storage.

## Google Calendar

Create a Google Cloud service account, enable the Google Calendar API, then share the booking calendar with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an editor. Set `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` and `GOOGLE_CALENDAR_ID` in the deployment environment. Store the key only in secret environment variables; never commit it. The code queries calendar busy periods when generating availability and inserts an event only after the operator confirms payment. If Google credentials are not configured, calendar busy periods cannot be read and confirmed bookings will not sync; configure credentials before accepting real reservations.

The existing personal agenda URL is not sufficient for API access. The calendar must be shared with the service account, or the integration must be changed to an OAuth flow.

## Operator workflow

The API is protected by `ADMIN_TOKEN`. Use the booking ID returned to the customer-facing request (in production, add private operator authentication and notifications before operating this manually).

Approve a request (moves it to `AWAITING_PAYMENT`):

```bash
curl -X PATCH http://localhost:3000/api/admin/bookings/BOOKING_ID \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' -H 'Content-Type: application/json' \
  -d '{"action":"approve"}'
```

After verifying the bank transfer manually, confirm payment (moves it to `CONFIRMED` and adds the event to Google Calendar):

```bash
curl -X PATCH http://localhost:3000/api/admin/bookings/BOOKING_ID \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' -H 'Content-Type: application/json' \
  -d '{"action":"confirm-payment"}'
```

Reject a request or release an unpaid slot with `{"action":"reject"}`. Non-rejected requests reserve their timeslot while awaiting review/payment. No payment gateway is connected.
