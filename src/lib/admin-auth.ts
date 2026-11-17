import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "venue_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.ADMIN_TOKEN;
  if (!value) throw new Error("ADMIN_TOKEN is not configured");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminPassword(value: unknown) {
  if (typeof value !== "string") return false;
  return safeEqual(value, secret());
}

export function createAdminSession(response: NextResponse) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(expires);
  response.cookies.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

export function isAdminRequest(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const item = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
    const value = item?.slice(COOKIE_NAME.length + 1);
    if (!value) return false;
    const [expires, signature] = value.split(".");
    if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
    return safeEqual(signature, sign(expires));
  } catch {
    return false;
  }
}
