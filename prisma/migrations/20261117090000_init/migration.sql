CREATE TYPE "BookingStatus" AS ENUM ('PENDING_REVIEW', 'AWAITING_PAYMENT', 'CONFIRMED', 'REJECTED');

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "calendarEventId" TEXT,
  "paymentReportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_startAt_endAt_status_idx" ON "Booking"("startAt", "endAt", "status");
