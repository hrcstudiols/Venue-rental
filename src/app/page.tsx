"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Slot = { start: string; end: string; available: boolean };
const todayTaipei = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function Home() {
  const [date, setDate] = useState(todayTaipei);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSlots(day: string) {
    setStartHour(null);
    try {
      const response = await fetch(`/api/availability?date=${encodeURIComponent(day)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法載入時段");
      setSlots(data.slots);
    } catch (e) { setSlots([]); setError(e instanceof Error ? e.message : "無法載入時段"); }
  }
  useEffect(() => { void loadSlots(date); }, [date]);

  const durationOptions = useMemo(() => {
    if (startHour === null) return [1];
    const max = Math.min(13, 24 - startHour);
    let count = 0;
    for (let hour = startHour; hour < 24; hour++) {
      if (!slots.find((slot) => Number(slot.start.slice(0, 2)) === hour)?.available) break;
      count++;
    }
    return Array.from({ length: Math.min(max, count) }, (_, index) => index + 1);
  }, [startHour, slots]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (startHour === null) { setError("請先選擇開始時段"); return; }
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, startHour, duration, customerName: form.get("customerName"), email: form.get("email"), phone: form.get("phone"), note: form.get("note") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "送出失敗");
      setMessage(data.message); event.currentTarget.reset(); await loadSlots(date);
    } catch (e) { setError(e instanceof Error ? e.message : "送出失敗"); }
    finally { setLoading(false); }
  }

  const endHour = startHour === null ? null : startHour + duration;
  return <main className="wrap">
    <header><span className="eyebrow">VENUE RENTAL</span><h1>場地租借</h1><p>選擇日期與時段，送出預約申請。</p></header>
    <section className="card">
      <h2>選擇租借時段</h2>
      <label className="field">日期 <input type="date" value={date} min={todayTaipei()} onChange={(e) => { setError(""); setDate(e.target.value); }} /></label>
      <p className="hint">每日 11:00–24:00・每小時為單位・時區 Asia/Taipei</p>
      <div className="slots">{slots.map((slot) => { const hour = Number(slot.start.slice(0, 2)); const selectable = slot.available && (startHour === null || hour >= startHour); return <button key={slot.start} type="button" className={`slot ${startHour === hour ? "selected" : ""}`} disabled={!selectable} onClick={() => { setStartHour(hour); setDuration(1); setError(""); }}>{slot.start}<small>{slot.available ? "可預約" : "已額滿"}</small></button>; })}</div>
      {startHour !== null && <label className="field duration">租借時數 <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{durationOptions.map((n) => <option value={n} key={n}>{n} 小時（{String(startHour).padStart(2, "0")}:00–{startHour + n === 24 ? "24" : String(startHour + n).padStart(2, "0")}:00）</option>)}</select></label>}
    </section>
    <section className="card">
      <h2>聯絡資料</h2>
      <form onSubmit={submit}>
        <div className="fields"><label className="field">姓名<input name="customerName" required maxLength={100} /></label><label className="field">Email<input name="email" type="email" required maxLength={254} /></label><label className="field">聯絡電話<input name="phone" required maxLength={40} /></label><label className="field full">備註（選填）<textarea name="note" rows={3} maxLength={1000} /></label></div>
        <p className="hint">送出後由場地方確認；確認後請依通知匯款。款項經人工確認後，預約才正式成立。</p>
        {error && <p className="alert error">{error}</p>}{message && <p className="alert success">{message}</p>}
        <button className="submit" type="submit" disabled={loading || startHour === null}>{loading ? "送出中…" : "送出預約申請"}</button>
      </form>
    </section>
    <footer>預約狀態以場地方通知為準。</footer>
  </main>;
}
