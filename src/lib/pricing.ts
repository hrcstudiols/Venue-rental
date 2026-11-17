import type { Room } from "@/lib/google-calendar";

export function hourlyRate(room: Room, hrcTeacher: boolean) {
  if (hrcTeacher) return room === "A" ? 450 : 550;
  return room === "A" ? 700 : 800;
}

export function bookingPrice(room: Room, hrcTeacher: boolean, startAt: Date, endAt: Date) {
  const halfHours = (endAt.getTime() - startAt.getTime()) / (30 * 60 * 1000);
  return (hourlyRate(room, hrcTeacher) / 2) * halfHours;
}

export function cancellationRefund(totalPrice: number, startAt: Date, requestedAt: Date) {
  const hoursBefore = (startAt.getTime() - requestedAt.getTime()) / (60 * 60 * 1000);
  if (hoursBefore >= 24) return totalPrice;
  if (hoursBefore >= 12) return Math.round(totalPrice * 0.7);
  return 0;
}
