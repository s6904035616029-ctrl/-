"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const TZ = "Asia/Bangkok";

function fmtWhen(iso) {
  return (
    new Date(iso).toLocaleString("th-TH", { timeZone: TZ, dateStyle: "long", timeStyle: "short" }) + " น."
  );
}
function remindText(min) {
  return min >= 1440 ? `${min / 1440} วัน` : `${min / 60} ชั่วโมง`;
}

export default function RemindersPage() {
  const [session, setSession] = useState(undefined); // undefined = กำลังตรวจ, null = ยังไม่ล็อกอิน
  const [tab, setTab] = useState("meds");
  const [msg, setMsg] = useState({ text: "", kind: "" });

  const say = useCallback((text, kind = "") => {
    setMsg({ text, kind });
    if (kind === "ok") setTimeout(() => setMsg((m) => (m.text === text ? { text: "", kind: "" } : m)), 3000);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <main><p className="meta">กำลังโหลด...</p></main>;
  if (!session) return <main><Login /></main>;

  return (
    <main>
      <div className="top">
        <h1>ยาและนัดหมาย</h1>
        <button className="ghost small" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
      </div>
      <p className={`msg ${msg.kind}`} role="status">{msg.text}</p>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "meds"} onClick={() => setTab("meds")}>ยา</button>
        <button role="tab" aria-selected={tab === "appts"} onClick={() => setTab("appts")}>นัดหมาย</button>
      </div>

      {tab === "meds" ? <Meds say={say} /> : <Appts say={say} />}

      <p className="note">ระบบนี้ช่วยเตือนความจำเท่านั้น ชื่อยาและขนาดยาต้องมาจากแพทย์หรือเภสัชกร</p>
    </main>
  );
}

/* ---------- ล็อกอิน (ไม่มีปุ่มสมัครสมาชิก) ---------- */
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
  }

  return (
    <>
      <h1>ยาและนัดหมาย</h1>
      <p className="meta">เข้าสู่ระบบด้วยอีเมลที่เจ้าของระบบสร้างให้</p>
      <form className="panel" onSubmit={submit}>
        <label htmlFor="email">อีเมล</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">รหัสผ่าน</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="actions"><button type="submit">เข้าสู่ระบบ</button></div>
        <p className="msg err" role="status">{err}</p>
      </form>
    </>
  );
}

/* ---------- แท็บยา ---------- */
function Meds({ say }) {
  const [rows, setRows] = useState(null);
  const [person, setPerson] = useState("");
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("medications").select("*").order("take_time");
    if (error) return say("โหลดรายการยาไม่สำเร็จ: " + error.message, "err");
    setRows(data);
  }, [say]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    if (!name.trim() || !time) return say("กรอกชื่อยาและเวลาทานก่อน", "err");
    const { error } = await supabase.from("medications").insert({
      person: person.trim() || "-",
      name: name.trim(),
      dose: dose.trim() || null,
      take_time: time,
    });
    if (error) return say("บันทึกไม่สำเร็จ: " + error.message, "err");
    setName(""); setDose(""); setTime(""); setPerson("");
    say("บันทึกแล้ว", "ok");
    load();
  }
  async function toggle(m) {
    const { error } = await supabase.from("medications").update({ active: !m.active }).eq("id", m.id);
    if (error) return say("เปลี่ยนสถานะไม่สำเร็จ: " + error.message, "err");
    say("บันทึกแล้ว", "ok");
    load();
  }
  async function remove(m) {
    if (!confirm(`ลบ "${m.name}" ของ ${m.person} ใช่หรือไม่?`)) return;
    const { error } = await supabase.from("medications").delete().eq("id", m.id);
    if (error) return say("ลบไม่สำเร็จ: " + error.message, "err");
    say("ลบแล้ว", "ok");
    load();
  }

  return (
    <>
      <form className="panel" onSubmit={add}>
        <h2>เพิ่มยา</h2>
        <div className="row">
          <div><label htmlFor="mPerson">ชื่อผู้ทาน</label><input id="mPerson" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="เช่น ตัวเอง, คุณแม่" /></div>
          <div><label htmlFor="mTime">เวลาทาน (เวลาไทย)</label><input id="mTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <label htmlFor="mName">ชื่อยา</label>
        <input id="mName" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="mDose">ขนาด / วิธีทาน</label>
        <input id="mDose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="เช่น 1 เม็ด หลังอาหาร" />
        <p className="note">ยาที่ทานวันละหลายครั้ง ให้เพิ่มแยกทีละเวลา และอย่าใช้ตัวอักษร &lt; &gt; &amp;</p>
        <div className="actions"><button type="submit">บันทึกยา</button></div>
      </form>

      <div className="panel">
        <h2>รายการยา</h2>
        {rows === null ? <p className="empty">กำลังโหลด...</p>
          : rows.length === 0 ? <p className="empty">ยังไม่มียา เพิ่มตัวแรกได้จากฟอร์มด้านบน</p>
          : rows.map((m) => (
            <div key={m.id} className={`item ${m.active ? "" : "off"}`}>
              <div>
                <div className="time">{m.take_time.slice(0, 5)} น.</div>
                <strong>{m.name}</strong> <span className="meta">· {m.person}</span><br />
                <span className="meta">{m.dose || "ไม่ได้ระบุขนาด"}</span>
                {!m.active && <> <span className="tag done">ปิดเตือนอยู่</span></>}
              </div>
              <div className="btns">
                <button className="ghost small" onClick={() => toggle(m)}>{m.active ? "ปิดเตือน" : "เปิดเตือน"}</button>
                <button className="danger small" onClick={() => remove(m)}>ลบ</button>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

/* ---------- แท็บนัดหมาย ---------- */
function Appts({ say }) {
  const [rows, setRows] = useState(null);
  const [person, setPerson] = useState("");
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState("");
  const [remind, setRemind] = useState("120");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("appointments").select("*").order("appt_at");
    if (error) return say("โหลดนัดหมายไม่สำเร็จ: " + error.message, "err");
    setRows(data);
  }, [say]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    if (!title.trim() || !when) return say("กรอกเรื่องและวัน-เวลานัดก่อน", "err");
    const { error } = await supabase.from("appointments").insert({
      person: person.trim() || "-",
      title: title.trim(),
      place: place.trim() || null,
      appt_at: new Date(when + ":00+07:00").toISOString(), // ตีความเป็นเวลาไทยเสมอ
      remind_before_minutes: Number(remind),
      sent: false,
    });
    if (error) return say("บันทึกไม่สำเร็จ: " + error.message, "err");
    setTitle(""); setPlace(""); setWhen(""); setRemind("120"); setPerson("");
    say("บันทึกแล้ว", "ok");
    load();
  }
  async function remove(a) {
    if (!confirm(`ลบนัด "${a.title}" ใช่หรือไม่?`)) return;
    const { error } = await supabase.from("appointments").delete().eq("id", a.id);
    if (error) return say("ลบไม่สำเร็จ: " + error.message, "err");
    say("ลบแล้ว", "ok");
    load();
  }

  return (
    <>
      <form className="panel" onSubmit={add}>
        <h2>เพิ่มนัดหมาย</h2>
        <div className="row">
          <div><label htmlFor="aPerson">ผู้ไป</label><input id="aPerson" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="เช่น ตัวเอง, คุณแม่" /></div>
          <div><label htmlFor="aWhen">วัน-เวลานัด (เวลาไทย)</label><input id="aWhen" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        </div>
        <label htmlFor="aTitle">เรื่อง</label>
        <input id="aTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ตรวจเบาหวาน" />
        <label htmlFor="aPlace">สถานที่</label>
        <input id="aPlace" value={place} onChange={(e) => setPlace(e.target.value)} />
        <label htmlFor="aRemind">เตือนล่วงหน้า</label>
        <select id="aRemind" value={remind} onChange={(e) => setRemind(e.target.value)}>
          <option value="120">2 ชั่วโมง</option>
          <option value="1440">1 วัน</option>
          <option value="2880">2 วัน</option>
        </select>
        <div className="actions"><button type="submit">บันทึกนัด</button></div>
      </form>

      <div className="panel">
        <h2>รายการนัด</h2>
        {rows === null ? <p className="empty">กำลังโหลด...</p>
          : rows.length === 0 ? <p className="empty">ยังไม่มีนัด เพิ่มได้จากฟอร์มด้านบน</p>
          : rows.map((a) => {
            const past = new Date(a.appt_at).getTime() < Date.now();
            return (
              <div key={a.id} className={`item appt ${past ? "off" : ""}`}>
                <div>
                  <div className="time">{fmtWhen(a.appt_at)}</div>
                  <strong>{a.title}</strong> <span className="meta">· {a.person}</span><br />
                  <span className="meta">{a.place || "ไม่ได้ระบุสถานที่"}</span><br />
                  <span className={`tag ${a.sent || past ? "done" : ""}`}>
                    {past ? "ผ่านไปแล้ว" : a.sent ? "เตือนแล้ว" : `จะเตือนล่วงหน้า ${remindText(a.remind_before_minutes)}`}
                  </span>
                </div>
                <div className="btns">
                  <button className="danger small" onClick={() => remove(a)}>ลบ</button>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
