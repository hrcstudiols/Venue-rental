# 場地租借網站

Next.js App Router booking site with Taipei-time availability (daily 11:00–24:00, one-hour increments). Customers submit a request; the operator approves it, the customer transfers to the bank account below, and the operator manually confirms receipt. Only then is the booking confirmed and added to Google Calendar.

## Local development

Requirements: Node.js 20.9+, npm, and a PostgreSQL database (local or hosted).

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string and `ADMIN_TOKEN` to a long, random secret.
2. Install and start the application:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run dev
   ```

3. Open http://localhost:3000. The customer booking page is `/`; the operator page is `/admin`.

## Operator flow

1. Sign in at `/admin` using the `ADMIN_TOKEN` value.
2. Review requests and approve or reject them. Approval changes the state to awaiting payment.
3. Send the bank details to the customer (displayed on their private booking status page): **玉山銀行（808）／帳號 0875979137790**.
4. The customer can report that the transfer was made. This is only a notification; it does not verify payment.
5. Check the actual bank transaction, then use **確認入帳** in `/admin`. The booking is confirmed and the calendar event is created if Google Calendar is configured.

Customer status links use the booking's unguessable ID and show no personal details. Do not share the link publicly. There is no automatic payment verification or payment gateway.

## Google Calendar

Create a Google Cloud service account, enable the Google Calendar API, then share the booking calendar with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an editor. Set `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` and `GOOGLE_CALENDAR_ID` in the deployment environment. Keep the private key in secret environment variables; never commit it. The app reads calendar busy periods for availability and creates an event only after payment is manually confirmed. Without Google credentials, calendar busy periods are not included and confirmed bookings do not sync.

The personal agenda URL alone is not API access. Share the target calendar with the service account, or implement an OAuth flow.

## Deploy to Vercel

1. Create a managed PostgreSQL database (for example, Neon or another provider) and copy its pooled/runtime connection string into Vercel as `DATABASE_URL`. Make sure the provider's string includes the required SSL options.
2. Import this repository into Vercel. `vercel.json` selects the Next.js framework, build command, and Hong Kong region (`hkg1`).
3. Add `ADMIN_TOKEN` as a Vercel environment variable for Production (and Preview only if you intend to use the admin there). Use a long random value; treat it as the admin password.
4. Add the three Google Calendar variables if calendar integration is ready. Keep secrets in Vercel Environment Variables.
5. Deploy. The build runs `prisma generate`, applies committed migrations with `prisma migrate deploy`, and builds Next.js. The production database must be reachable during the build.

SQLite is intentionally not used for deployment because Vercel's serverless filesystem is ephemeral. Do not set `DATABASE_URL` to a local file path in Vercel. If your Vercel database provider requires a separate direct connection for migrations, use its direct URL for `DATABASE_URL` during builds or add Prisma's `directUrl` configuration.
