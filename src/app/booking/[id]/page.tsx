"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Booking = { id: string; room: string; startAt: string; endAt: string; status: "PENDING_REVIEW" | "AWAITING_PAYMENT" | "CONFIRMED" | "REJECTED" | "CANCELLED"; requestedHrcTeacher: boolean; hrcTeacherApproved: boolean; totalPrice: number; paymentDueAt: string | null; paymentReportedAt: string | null; cancellationRequestedAt: string | null; refundAmount: number | null };
const labels: Record<Booking["status"], string> = { PENDING_REVIEW: "待場地方確認", AWAITING_PAYMENT: "已確認時段，待匯款", CONFIRMED: "預約成功", REJECTED: "未成立／已取消", CANCELLED: "已取消" };
const time = (value: string) => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "long", timeStyle: "short" }).format(new Date(value));
const money = (amount: number) => new Intl.NumberFormat("zh-TW").format(amount);

export default function BookingStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [refundEstimate, setRefundEstimate] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch(`/api/booking/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "無法讀取預約");
    setBooking(data.booking); setRefundEstimate(data.cancellationRefundEstimate);
  }
  useEffect(() => { void refresh().catch((e) => setError(e.message)); }, [id]);
  async function action(actionName: "payment" | "cancel") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/booking/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "操作失敗");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "操作失敗"); }
    finally { setBusy(false); }
  }
  if (error && !booking) return <main className="wrap"><section className="card"><h1>無法載入預約</h1><p className="alert error">{error}</p><a href="/">返回首頁</a></section></main>;
  if (!booking) return <main className="wrap"><section className="card">載入中…</section></main>;
  return <main className="wrap"><header className="hero"><span className="eyebrow">BOOKING STATUS</span><h1>{labels[booking.status]}</h1><p>請保留此頁連結，以便查詢預約狀態。</p></header><section className="card"><h2>預約資訊</h2><p><strong>預約編號：</strong>{booking.id}</p><p><strong>教室：</strong>{booking.room} 教室</p><p><strong>時段：</strong>{time(booking.startAt)} – {time(booking.endAt)}</p><p><strong>費用：</strong>NT${money(booking.totalPrice)}{booking.requestedHrcTeacher && !booking.hrcTeacherApproved ? "（HRC 老師身份審核中，核准後套用優惠價）" : booking.hrcTeacherApproved ? "（HRC 老師優惠價）" : ""}</p>
    {booking.status === "PENDING_REVIEW" && <p className="hint">申請已送出，場地方確認後會通知匯款。若申請老師優惠，需先完成身份審核。</p>}
    {booking.status === "AWAITING_PAYMENT" && <><div className="bank"><h3>匯款資訊</h3><p>玉山銀行（808）</p><p>帳號：<strong>0875979137790</strong></p><p><strong>請於 {booking.paymentDueAt ? time(booking.paymentDueAt) : "確認後 5 日內"} 前完成匯款。</strong></p><p className="hint">匯款後請通知場地方；此通知不代表付款已核實。</p></div><button className="submit" disabled={busy || Boolean(booking.paymentReportedAt)} onClick={() => void action("payment")}>{busy ? "送出中…" : booking.paymentReportedAt ? "已通知場地方，等待核帳" : "我已完成匯款，通知場地方"}</button>{booking.paymentReportedAt && <p className="alert success">已於 {time(booking.paymentReportedAt)} 通知，待人工核對入帳。</p>}</>}
    {booking.status === "CONFIRMED" && <><p className="alert success">款項已由場地方確認，預約成立。</p>{booking.cancellationRequestedAt ? <p className="hint">取消申請已於 {time(booking.cancellationRequestedAt)} 送出，待場地方處理。依申請時間估算退款：NT${money(refundEstimate ?? 0)}。</p> : <div className="cancel-box"><h3>取消與退費</h3><p>24 小時前全額；12 至未滿 24 小時退 70%；未滿 12 小時或當日未到不退費。退款由場地方人工處理。</p><p>目前估算可退：NT${money(refundEstimate ?? 0)}</p><button className="danger" disabled={busy} onClick={() => { if (confirm("確定送出取消申請？退款金額依提出申請的時間計算，並由場地方人工處理。")) void action("cancel"); }}>申請取消預約</button></div>}</>}
    {booking.status === "CANCELLED" && <p className="alert success">預約已取消。場地方處理的退款金額：NT${money(booking.refundAmount ?? 0)}。</p>}
    {booking.status === "REJECTED" && <p className="alert error">此預約未成立。如需協助，請聯絡場地方。</p>}{error && <p className="alert error">{error}</p>}<p><a href="/">返回場地租借首頁</a></p></section></main>;
}
