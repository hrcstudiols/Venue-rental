"use client";

import { FormEvent, useEffect, useState } from "react";

type Booking = { id: string; customerName: string; email: string; phone: string; room: string; startAt: string; endAt: string; note: string; status: "PENDING_REVIEW" | "AWAITING_PAYMENT" | "CONFIRMED" | "REJECTED" | "CANCELLED"; requestedHrcTeacher: boolean; hrcTeacherApproved: boolean; totalPrice: number; paymentDueAt: string | null; paymentReportedAt: string | null; cancellationRequestedAt: string | null; refundAmount: number | null; createdAt: string };
const statusLabel: Record<Booking["status"], string> = { PENDING_REVIEW: "待審核", AWAITING_PAYMENT: "待付款", CONFIRMED: "已成立", REJECTED: "已拒絕", CANCELLED: "已取消" };
const time = (value: string) => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const money = (amount: number) => new Intl.NumberFormat("zh-TW").format(amount);

export default function AdminPage() {
  const [password, setPassword] = useState(""); const [authenticated, setAuthenticated] = useState(false); const [bookings, setBookings] = useState<Booking[]>([]); const [error, setError] = useState(""); const [busyId, setBusyId] = useState("");
  async function load() {
    const response = await fetch("/api/admin/bookings", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "載入失敗"); setBookings(data.bookings); setAuthenticated(true);
  }
  useEffect(() => { void load().catch((e) => setError(e.message)); }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setError(""); const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const data = await response.json();
    if (!response.ok) { setError(data.error ?? "登入失敗"); return; } setPassword(""); await load();
  }
  async function action(id: string, actionName: string) {
    setBusyId(id); setError("");
    try { const response = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "操作失敗"); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "操作失敗"); } finally { setBusyId(""); }
  }
  async function logout() { await fetch("/api/admin/session", { method: "DELETE" }); setAuthenticated(false); }
  return <main className="wrap admin-wrap"><header className="hero"><span className="eyebrow">HRC DANCE STUDIO</span><h1>管理後台</h1><p>審核身份與預約、確認入帳及處理取消申請。</p></header>
    {!authenticated ? <section className="card"><h2>管理者登入</h2><form onSubmit={login}><label className="field">管理密碼<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>{error && <p className="alert error">{error}</p>}<button className="submit" type="submit">登入</button></form></section> : <><section className="admin-toolbar"><span>預約共 {bookings.length} 筆（最多顯示 200 筆）</span><div><button className="secondary" onClick={() => void load()}>重新整理</button> <button className="secondary" onClick={() => void logout()}>登出</button></div></section>{error && <p className="alert error">{error}</p>}{bookings.length === 0 && <section className="card">目前沒有預約。</section>}
      {bookings.map((b) => <section className="card booking-card" key={b.id}><div className="booking-title"><div><span className={`badge ${b.status.toLowerCase()}`}>{statusLabel[b.status]}</span><h2>{b.customerName}・{b.room} 教室</h2></div><span className="hint">{time(b.createdAt)} 送出</span></div><p><strong>時段：</strong>{time(b.startAt)} – {time(b.endAt)}</p><p><strong>費用：</strong>NT${money(b.totalPrice)} {b.hrcTeacherApproved ? "（HRC 老師優惠已核准）" : b.requestedHrcTeacher ? "（申請 HRC 老師優惠，待身份審核）" : "（一般民眾）"}</p><p><strong>Email：</strong><a href={`mailto:${b.email}`}>{b.email}</a>　<strong>電話：</strong><a href={`tel:${b.phone}`}>{b.phone}</a></p>{b.note && <p><strong>備註：</strong>{b.note}</p>}
        {b.requestedHrcTeacher && b.status === "PENDING_REVIEW" && <div className="admin-actions"><button className="submit" disabled={busyId === b.id || b.hrcTeacherApproved} onClick={() => void action(b.id, "approve-teacher")}>{b.hrcTeacherApproved ? "HRC 身份已核准" : "核准 HRC 老師優惠"}</button>{!b.hrcTeacherApproved && <button className="secondary" disabled={busyId === b.id} onClick={() => { if (confirm("拒絕老師優惠申請，改按一般民眾價格計費？")) void action(b.id, "decline-teacher"); }}>拒絕優惠申請</button>}</div>}
        {b.status === "AWAITING_PAYMENT" && <><p className={b.paymentReportedAt ? "alert success" : "hint"}>{b.paymentReportedAt ? `客人已於 ${time(b.paymentReportedAt)} 回報匯款，請核對銀行入帳。` : "尚未收到客人匯款回報。"} {b.paymentDueAt ? `付款期限：${time(b.paymentDueAt)}` : ""}</p><p className="hint">匯款資訊：玉山銀行（808）／0875979137790</p></>}
        {b.cancellationRequestedAt && b.status === "CONFIRMED" && <p className="alert error">客人申請取消：{time(b.cancellationRequestedAt)}。依申請時間核算退款後，請人工退款並處理。</p>}
        {b.status === "CANCELLED" && <p className="hint">已取消，記錄退款金額：NT${money(b.refundAmount ?? 0)}</p>}
        <p className="hint">客人狀態頁：<a href={`/booking/${b.id}`} target="_blank" rel="noreferrer">開啟預約狀態</a></p><div className="admin-actions">
          {b.status === "PENDING_REVIEW" && <button className="submit" disabled={busyId === b.id || (b.requestedHrcTeacher && !b.hrcTeacherApproved)} onClick={() => void action(b.id, "approve")}>確認時段並通知匯款</button>}
          {b.status === "AWAITING_PAYMENT" && <button className="submit" disabled={busyId === b.id} onClick={() => void action(b.id, "confirm-payment")}>確認入帳／成立預約</button>}
          {b.status === "CONFIRMED" && b.cancellationRequestedAt && <button className="danger" disabled={busyId === b.id} onClick={() => { if (confirm("請先按取消規則處理應退款項，再確認完成取消。")) void action(b.id, "process-cancellation"); }}>完成取消處理</button>}
          {["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(b.status) && <button className="danger" disabled={busyId === b.id} onClick={() => { if (confirm("確定拒絕此預約並釋出時段？")) void action(b.id, "reject"); }}>拒絕預約</button>}
        </div></section>)}</>}
    <footer><a href="/">返回預約頁面</a></footer></main>;
}
