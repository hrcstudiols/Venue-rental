"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Room = "A" | "F";
type Slot = { start: string; end: string; startMinutes: number; available: boolean };
const todayTaipei = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const rate = (room: Room, teacher: boolean) => teacher ? (room === "A" ? 450 : 550) : (room === "A" ? 700 : 800);
const money = (amount: number) => new Intl.NumberFormat("zh-TW").format(amount);

export default function Home() {
  const router = useRouter();
  const [date, setDate] = useState(todayTaipei);
  const [room, setRoom] = useState<Room>("A");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [durationUnits, setDurationUnits] = useState(2);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function loadSlots(day: string, selectedRoom: Room) {
    setStartMinutes(null);
    try {
      const response = await fetch(`/api/availability?date=${encodeURIComponent(day)}&room=${selectedRoom}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法載入時段");
      setSlots(data.slots);
    } catch (e) { setSlots([]); setError(e instanceof Error ? e.message : "無法載入時段"); }
  }
  useEffect(() => { void loadSlots(date, room); }, [date, room]);
  const durationOptions = useMemo(() => {
    if (startMinutes === null) return [];
    let count = 0;
    for (let minute = startMinutes; minute < 1440; minute += 30) {
      if (!slots.find((slot) => slot.startMinutes === minute)?.available) break;
      count++;
    }
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [startMinutes, slots]);
  const totalPrice = startMinutes === null ? 0 : (rate(room, false) / 2) * durationUnits;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (startMinutes === null) { setError("請先選擇開始時段"); return; }
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, room, startMinutes, durationUnits, customerName: form.get("customerName"), email: form.get("email"), phone: form.get("phone"), note: form.get("note"), requestedHrcTeacher: form.get("requestedHrcTeacher") === "on" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "送出失敗");
      router.push(`/booking/${data.booking.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "送出失敗"); }
    finally { setLoading(false); }
  }
  return <main className="wrap">
    <header className="hero"><span className="eyebrow">HRC DANCE STUDIO</span><h1>HRC龍山訓練基地</h1><p>讓每一次練習，都有自己的舞台。</p></header>
    <section className="card"><h2>選擇教室與時段</h2>
      <label className="field">教室<select value={room} onChange={(e) => { setRoom(e.target.value as Room); setError(""); }}><option value="A">A 教室</option><option value="F">F 教室</option></select></label>
      <label className="field date-field">日期<input type="date" value={date} min={todayTaipei()} onChange={(e) => { setError(""); setDate(e.target.value); }} /></label>
      <p className="hint">每日 11:00–24:00・每半小時為單位・時區 Asia/Taipei</p>
      <div className="slots">{slots.map((slot) => <button key={slot.start} type="button" className={`slot ${startMinutes === slot.startMinutes ? "selected" : ""}`} disabled={!slot.available || (startMinutes !== null && slot.startMinutes < startMinutes)} onClick={() => { setStartMinutes(slot.startMinutes); setDurationUnits(2); setError(""); }}>{slot.start}<small>{slot.available ? "可租" : "已預約"}</small></button>)}</div>
      {startMinutes !== null && <label className="field duration">租借時數<select value={durationUnits} onChange={(e) => setDurationUnits(Number(e.target.value))}>{durationOptions.map((n) => <option value={n} key={n}>{n % 2 === 0 ? `${n / 2} 小時` : `${Math.floor(n / 2)} 小時 30 分`}（{slots.find((slot) => slot.startMinutes === startMinutes)?.start}–{slots.find((slot) => slot.startMinutes === startMinutes + n * 30)?.end ?? "24:00"}）</option>)}</select></label>}
    </section>
    <section className="card"><h2>租借費用</h2><div className="price-grid"><div><span>一般民眾</span><strong>A 教室 NT${rate("A", false)}/時</strong><strong>F 教室 NT${rate("F", false)}/時</strong></div><div><span>HRC 老師（身份審核後）</span><strong>A 教室 NT${rate("A", true)}/時</strong><strong>F 教室 NT${rate("F", true)}/時</strong></div></div>{startMinutes !== null && <p className="price-total">預估租金 <strong>NT${money(totalPrice)}</strong>{" "}<span>（HRC 老師優惠需經管理員核實）</span></p>}</section>
    <section className="card"><h2>聯絡資料</h2><form onSubmit={submit}><div className="fields"><label className="field">姓名<input name="customerName" required maxLength={100} /></label><label className="field">Email<input name="email" type="email" required maxLength={254} /></label><label className="field">聯絡電話<input name="phone" required maxLength={40} /></label><label className="field full">備註（選填）<textarea name="note" rows={3} maxLength={1000} /></label></div><label className="check-field"><input name="requestedHrcTeacher" type="checkbox" /> 我是 HRC 老師，申請老師優惠價（需管理員審核）</label><p className="hint">場地方確認後，請於 5 日內依預約狀態頁顯示的匯款資訊付款。實際入帳由管理員人工核實。</p>{error && <p className="alert error">{error}</p>}<button className="submit" type="submit" disabled={loading || startMinutes === null}>{loading ? "送出中…" : "送出預約申請"}</button></form></section>
    <section className="card policy"><h2>場地取消與退費說明</h2><ol><li>24 小時前取消：可退還全額費用。</li><li>12 小時前取消：退還 70% 費用（30% 為行政及場地安排成本）。</li><li>當日未到或未事先通知：視同取消，恕不退費。</li></ol><p className="hint">本網站依據你提供的規則計算：距開始時間 24 小時以上全額；12 至未滿 24 小時退還 70%；未滿 12 小時不退費。退款由場地方人工處理。</p></section>
    <footer>HRC龍山訓練基地・預約以場地方確認為準。 <a href="/admin">管理者登入</a></footer>
  </main>;
}
