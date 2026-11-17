import { NextResponse } from "next/server";
import { clearAdminSession, createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!verifyAdminPassword(password)) return NextResponse.json({ error: "管理密碼錯誤" }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    createAdminSession(response);
    return response;
  } catch {
    return NextResponse.json({ error: "無法登入，請確認伺服器設定" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSession(response);
  return response;
}
