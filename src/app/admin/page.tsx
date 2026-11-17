"use client";

import { FormEvent, useEffect, useState } from "react";

type Booking = { id: string; customerName: string; email: string; phone: string; startAt: string; endAt: string; note: string; status: "PENDING_REVIEW" | "AWAITING_PAYMENT" | "CONFIRMED" | "REJECTED"; paymentReportedAt: string | null; createdAt: string };
const statusLabel: Record<Booking["status"], string> = { PENDING_REVIEW: "待審核", AWAITING_PAYMENT: "待付款", CONFIRMED: "已成立", REJECTED: "已拒絕／取消" };
const time = (value: string) => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  async function load() {
    const response = await fetch("/api/admin/bookings", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "載入失敗");
    setBookings(data.bookings); setAuthenticated(true);
  }
  useEffect(() => { void load().catch((e) => setError(e.message)); }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "登入失敗"); return; }
    setPassword(""); await load();
  }
  async function action(id: string, actionName: "approve" | "confirm-payment" | "reject") {
    setBusyId(id); setError("");
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "操作失敗");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "操作失敗"); }
    finally { setBusyId(""); }
  }
  async function logout() { await fetch("/api/admin/session", { method: "DELETE" }); setAuthenticated(false); }

  return <main className="wrap admin-wrap"><header><span className="eyebrow">VENUE RENTAL</span><h1>管理後台</h1><p>審核預約、確認匯款；付款須以銀行實際入帳為準。</p></header>
    {!authenticated ? <section className="card"><h2>管理者登入</h2><form onSubmit={login}><label className="field">管理密碼<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>{error && <p className="alert error">{error}</p>}<button className="submit" type="submit">登入</button></form></section> : <>
      <section className="admin-toolbar"><span>預約共 {bookings.length} 筆（最多顯示 200 筆）</span><div><button className="secondary" onClick={() => void load()}>重新整理</button> <button className="secondary" onClick={() => void logout()}>登出</button></div></section>
      {error && <p className="alert error">{error}</p>}
      {bookings.length === 0 && <section className="card">目前沒有預約。</section>}
      {bookings.map((booking) => <section className="card booking-card" key={booking.id}><div className="booking-title"><div><span className={`badge ${booking.status.toLowerCase()}`}>{statusLabel[booking.status]}</span><h2>{booking.customerName}</h2></div><span className="hint">{time(booking.createdAt)} 送出</span></div><p><strong>時段：</strong>{time(booking.startAt)} – {time(booking.endAt)}</p><p><strong>Email：</strong><a href={`mailto:${booking.email}`}>{booking.email}</a>　<strong>電話：</strong><a href={`tel:${booking.phone}`}>{booking.phone}</a></p>{booking.note && <p><strong>備註：</strong>{booking.note}</p>}
        {booking.status === "AWAITING_PAYMENT" && <p className={booking.paymentReportedAt ? "alert success" : "hint"}>{booking.paymentReportedAt ? `客人已於 ${time(booking.paymentReportedAt)} 回報匯款，請核對銀行入帳。` : "尚未收到客人匯款回報。"}</p>}
        <p className="hint">客人狀態頁：<a href={`/booking/${booking.id}`} target="_blank" rel="noreferrer">開啟預約狀態</a></p>
        <div className="admin-actions">{booking.status === "PENDING_REVIEW" && <button className="submit" disabled={busyId === booking.id} onClick={() => void action(booking.id, "approve")}>確認時段並通知匯款</button>}{booking.status === "AWAITING_PAYMENT" && <button className="submit" disabled={busyId === booking.id} onClick={() => void action(booking.id, "confirm-payment")}>確認入帳／成立預約</button>}{["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(booking.status) && <button className="danger" disabled={busyId === booking.id} onClick={() => { if (confirm("確定拒絕此預約並釋出時段？")) void action(booking.id, "reject"); }}>拒絕預約</button>}</div>
      </section>)}
    </>}
    <footer><a href="/">返回預約頁面</a></footer>
  </main>;
}
