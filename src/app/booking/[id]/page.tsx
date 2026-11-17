"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Booking = { id: string; startAt: string; endAt: string; status: "PENDING_REVIEW" | "AWAITING_PAYMENT" | "CONFIRMED" | "REJECTED"; paymentReportedAt: string | null };
const labels: Record<Booking["status"], string> = { PENDING_REVIEW: "待場地方確認", AWAITING_PAYMENT: "已確認時段，待匯款", CONFIRMED: "預約成功", REJECTED: "未成立／已取消" };
const time = (value: string) => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "long", timeStyle: "short" }).format(new Date(value));

export default function BookingStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch(`/api/booking/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "無法讀取預約");
    setBooking(data.booking);
  }
  useEffect(() => { void refresh().catch((e) => setError(e.message)); }, [id]);
  async function reportPayment(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/booking/${id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "通知失敗");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "通知失敗"); }
    finally { setBusy(false); }
  }
  if (error && !booking) return <main className="wrap"><section className="card"><h1>無法載入預約</h1><p className="alert error">{error}</p><a href="/">返回首頁</a></section></main>;
  if (!booking) return <main className="wrap"><section className="card">載入中…</section></main>;
  return <main className="wrap">
    <header><span className="eyebrow">BOOKING STATUS</span><h1>{labels[booking.status]}</h1><p>請保留此頁連結，以便查詢預約狀態。</p></header>
    <section className="card"><h2>預約資訊</h2><p><strong>預約編號：</strong>{booking.id}</p><p><strong>時段：</strong>{time(booking.startAt)} – {time(booking.endAt)}</p>
      {booking.status === "PENDING_REVIEW" && <p className="hint">申請已送出，場地方確認後會通知匯款。</p>}
      {booking.status === "AWAITING_PAYMENT" && <><div className="bank"><h3>匯款資訊</h3><p>玉山銀行（808）</p><p>帳號：<strong>0875979137790</strong></p><p className="hint">請於匯款後使用下方按鈕通知場地方。此通知不代表付款已核實。</p></div><form onSubmit={reportPayment}><button className="submit" disabled={busy || Boolean(booking.paymentReportedAt)}>{busy ? "送出中…" : booking.paymentReportedAt ? "已通知場地方，等待核帳" : "我已完成匯款，通知場地方"}</button></form>{booking.paymentReportedAt && <p className="alert success">已於 {time(booking.paymentReportedAt)} 通知，待人工核對入帳。</p>}</>}
      {booking.status === "CONFIRMED" && <p className="alert success">款項已由場地方確認，預約成立。</p>}
      {booking.status === "REJECTED" && <p className="alert error">此預約未成立。如需協助，請聯絡場地方。</p>}
      {error && <p className="alert error">{error}</p>}
      <a href="/">返回場地租借首頁</a>
    </section>
  </main>;
}
