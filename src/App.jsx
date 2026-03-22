import { useState, useEffect, useRef, useCallback } from "react";

const WORKER_URL = "https://lifeos-api.sarpreet5601.workers.dev";

// Apply light mode class to <html> immediately on load — before any render
// This prevents flash of wrong theme
if (localStorage.getItem("lifeos_light") === "true") {
  document.documentElement.classList.add("light-mode");
}
const INACTIVITY_MS = 5 * 60 * 1000;

function getToken()       { return localStorage.getItem("lifeos_token") || ""; }
function stampActivity()  {
  localStorage.setItem("lifeos_last_active", Date.now());
  localStorage.removeItem("lifeos_hidden_at"); // any activity cancels the hide timer
}
function isSessionExpired() {
  const last = parseInt(localStorage.getItem("lifeos_last_active") || "0");
  return last && (Date.now() - last > INACTIVITY_MS);
}
function clearSession() {
  localStorage.removeItem("lifeos_token");
  localStorage.removeItem("lifeos_last_active");
  localStorage.removeItem("lifeos_hidden_at");
}

// Global callback set by App — called when any request returns 401
let onAuthFailure = null;

async function api(path, options = {}) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}`, ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    // Token expired or missing — clear session and trigger login screen
    clearSession();
    if (onAuthFailure) onAuthFailure();
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || "API error");
  }
  return res.json();
}

// Use LOCAL date — not UTC. UTC flips to tomorrow after ~4pm Pacific time.
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
// Get user's preferred week start day (0=Sun, 1=Mon, ..., 6=Sat). Default: Sunday=0
function getWeekStartDay() {
  return parseInt(localStorage.getItem("lifeos_week_start_day") || "0");
}

// Compute the most recent week-start date on or before dateStr, using user's preferred day
const weekStart = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const startDay = getWeekStartDay();
  const dow = d.getDay(); // 0=Sun..6=Sat
  // How many days back to go to reach the most recent startDay
  const diff = (dow - startDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
function dayDate(weekStartStr, dayName) {
  // Handles both abbreviated ("Mon") and full ("Monday") day names from AI
  const normalize = n => n ? n.slice(0,3) : "";
  const OFF = { Mon:0, Tue:1, Wed:2, Thu:3, Fri:4, Sat:5, Sun:6 };
  const key = normalize(dayName);
  const d = new Date(weekStartStr + "T12:00:00");
  d.setDate(d.getDate() + (OFF[key] ?? 0));
  return d;
}
function dayDateLabel(weekStartStr, dayName) {
  return dayDate(weekStartStr, dayName).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}
function isTodayDay(weekStartStr, dayName) {
  const d = dayDate(weekStartStr, dayName);
  // Use local date comparison — avoids UTC offset issues
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}` === todayStr();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  /* ── Dark theme (default) — Slate/Violet ── */
  --bg:#020617;--bg2:#0F172A;--bg3:#1E293B;--bg4:#334155;
  --b:#1E293B;--b2:#334155;
  /* Brand: violet */
  --a:#8B5CF6;--a2:#A78BFA;
  /* Module accents (dark) */
  --fitness-color:#A78BFA;--fitness-bg:rgba(167,139,250,0.08);--fitness-border:#5B21B6;
  --skills-color:#34D399;--skills-bg:rgba(52,211,153,0.08);--skills-border:#065F46;
  --hobbies-color:#FBBF24;--hobbies-bg:rgba(251,191,36,0.08);--hobbies-border:#92400E;
  /* Text */
  --t:#F1F5F9;--m:#94A3B8;--m2:#64748B;
  /* Status */
  --warn:#F87171;--gold:#FBBF24;--purple:#A78BFA;
  /* Misc */
  --font:'Syne',sans-serif;--mono:'DM Mono',monospace;
  --glow:0 0 20px rgba(139,92,246,0.18);
  --glow2:0 0 20px rgba(167,139,250,0.14);
  --sb:220px;--mob-nav:62px;--mob-header:54px;
  --r:12px;
}
/* ── LIGHT MODE — Violet/Slate ── */
.light-mode{
  --bg:#FDFBFD;
  --bg2:#FFFFFF;
  --bg3:#F8FAFC;
  --bg4:#F1F5F9;
  --b:#F1F5F9;
  --b2:#E2E8F0;
  /* Brand: violet-600 */
  --a:#7C3AED;--a2:#6D28D9;
  /* Module accents (light) */
  --fitness-color:#8B5CF6;--fitness-bg:rgba(139,92,246,0.06);--fitness-border:#DDD6FE;
  --skills-color:#10B981;--skills-bg:rgba(16,185,129,0.06);--skills-border:#A7F3D0;
  --hobbies-color:#F59E0B;--hobbies-bg:rgba(245,158,11,0.07);--hobbies-border:#FDE68A;
  /* Text */
  --t:#1E293B;--m:#64748B;--m2:#94A3B8;
  /* Status */
  --warn:#DC2626;--gold:#D97706;--purple:#7C3AED;
  --glow:0 0 16px rgba(124,58,237,0.1);
  --glow2:0 0 16px rgba(109,40,217,0.08);
}
.light-mode .card{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .bg2,.light-mode .sb,.light-mode .mob-header{background:#FFFFFF;}
/* Tasks */
.light-mode .ti{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .ti::before{background:linear-gradient(135deg,rgba(124,58,237,0.02),transparent);}
.light-mode .ti:hover{border-color:#E2E8F0;background:#F8FAFC;}
.light-mode .tbdg.p{background:rgba(124,58,237,0.07);color:#6D28D9;}
.light-mode .tbdg.d{background:rgba(16,185,129,0.08);color:#059669;}
/* Blueprint rows */
.light-mode .bpr{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .bpr:hover{background:#F8FAFC;border-color:#E2E8F0;}
.light-mode .bpr.today{background:#FAF5FF;border-color:#DDD6FE;box-shadow:0 0 14px rgba(124,58,237,0.07);}
/* AI boxes */
.light-mode .aib{background:#FAF5FF;border-color:#DDD6FE;}
.light-mode .aib-t{color:#6D28D9;}
.light-mode .aib p{color:#374151;}
/* Streak */
.light-mode .streak-banner{background:linear-gradient(135deg,rgba(124,58,237,0.05),rgba(109,40,217,0.03));border-color:#DDD6FE;}
.light-mode .streak-count{background:linear-gradient(135deg,#7C3AED,#6D28D9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.light-mode .streak-sb{background:#FAF5FF;border-color:#DDD6FE;}
.light-mode .streak-num{color:#7C3AED;}
/* Recovery ring */
.light-mode .rc-wrap{background:#FFFFFF;border-color:#F1F5F9;}
/* Notes */
.light-mode .processed-note{background:#FAF5FF;border-color:#DDD6FE;}
.light-mode .pn-meta{color:#6D28D9;}
.light-mode .pn-body{color:#374151;}
.light-mode .note-card{background:#FFFFFF;border-color:#F1F5F9;}
/* Goals */
.light-mode .goal-card{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .goal-ai{background:#FAF5FF;color:#374151;}
.light-mode .goal-input{background:#FFFFFF;border-color:#E2E8F0;}
/* Settings */
.light-mode .setting-row{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .danger-zone{background:rgba(220,38,38,0.03);border-color:rgba(220,38,38,0.1);}
/* Workout detail */
.light-mode .exr{background:#FAF5FF;}
.light-mode .exr:hover{background:#F5F0FF;}
.light-mode .exrp{background:rgba(124,58,237,0.08);color:#6D28D9;}
.light-mode .ex-section-title{color:#7C3AED;}
/* Sidebar nav */
.light-mode .ni{color:#475569;}
.light-mode .ni:hover{background:#F8FAFC;color:#1E293B;}
.light-mode .ni.on{color:#7C3AED;border-left-color:#7C3AED;background:rgba(124,58,237,0.05);}
.light-mode .ns{color:#94A3B8;}
.light-mode .wbadge{background:rgba(220,38,38,0.06);color:#DC2626;border-color:rgba(220,38,38,0.15);}
.light-mode .wbadge.ok{background:rgba(124,58,237,0.06);color:#7C3AED;border-color:#DDD6FE;}
/* Subnav */
.light-mode .subnav{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .sni{color:#64748B;}
.light-mode .sni:hover{color:#1E293B;}
.light-mode .sni.on{color:#7C3AED;border-bottom-color:#7C3AED;}
/* Context badges */
.light-mode .cw{background:rgba(124,58,237,0.06);color:#6D28D9;}
.light-mode .cc{background:rgba(16,185,129,0.06);color:#059669;}
.light-mode .cb{background:rgba(220,38,38,0.06);color:#DC2626;}
.light-mode .co{background:rgba(245,158,11,0.07);color:#D97706;}
.light-mode .cr{background:#F8FAFC;color:#475569;}
/* Buttons */
.light-mode .bp{background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#FFFFFF;}
.light-mode .bp:hover{filter:brightness(1.07);}
.light-mode .bs{background:#F8FAFC;border-color:#E2E8F0;color:#1E293B;}
.light-mode .bs:hover{background:#F1F5F9;border-color:#CBD5E1;}
.light-mode .bwarn{background:rgba(220,38,38,0.07);color:#DC2626;border-color:rgba(220,38,38,0.2);}
/* Modals */
.light-mode .modal{background:#FFFFFF;border-color:#E2E8F0;}
.light-mode .mh{border-color:#F1F5F9;}
.light-mode .mf{border-color:#F1F5F9;}
.light-mode .mcl{background:#F8FAFC;color:#64748B;}
.light-mode .mcl:hover{background:#F1F5F9;color:#1E293B;}
/* Upload zones */
.light-mode .uz{border-color:#E2E8F0;}
.light-mode .uz:hover{border-color:#7C3AED;background:rgba(124,58,237,0.02);}
.light-mode .upload-half:hover{border-color:#7C3AED;}
.light-mode .upload-half.has{border-color:#C4B5FD;background:rgba(124,58,237,0.03);}
/* Inputs */
.light-mode .ta,.light-mode .inp,.light-mode .sel{background:#FFFFFF;border-color:#E2E8F0;color:#1E293B;}
.light-mode .ta:focus,.light-mode .inp:focus{border-color:#7C3AED;box-shadow:0 0 0 3px rgba(124,58,237,0.08);}
.light-mode .ta::placeholder,.light-mode .inp::placeholder{color:#94A3B8;}
/* Dots loader */
.light-mode .dots span{background:#7C3AED;}
/* Error */
.light-mode .err-banner{background:rgba(220,38,38,0.05);border-color:rgba(220,38,38,0.15);color:#DC2626;}
/* Coming soon */
.light-mode .cs-item{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .cs-badge{background:rgba(124,58,237,0.06);border-color:#DDD6FE;color:#6D28D9;}
/* Toggle */
.light-mode .toggle{background:#E2E8F0;border-color:#CBD5E1;}
.light-mode .toggle.on{background:#7C3AED;}
.light-mode .toggle.on .toggle-thumb{background:#FFFFFF;}
/* AI box day note */
.light-mode .bp-note{background:#FAF5FF;color:#374151;}
/* Week reasoning */
.light-mode .week-reasoning{background:#FAF5FF;border-color:#DDD6FE;}
.light-mode .reasoning-lbl{color:#6D28D9;}
/* Mob header */
.light-mode .mob-header{background:#FFFFFF;border-color:#F1F5F9;}
.light-mode .mob-logo em{background:linear-gradient(135deg,#7C3AED,#6D28D9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.light-mode .mob-date{color:#475569;}
.light-mode .mob-streak{background:rgba(0,80,200,0.08);border-color:rgba(0,80,200,0.18);color:#0044BB;}
.light-mode .mob-wbadge.ok{background:#0055DD;box-shadow:0 0 5px rgba(0,80,200,0.4);}
.light-mode .mob-wbadge.err{background:#CC2200;}
/* Topbar */
.light-mode .ptitle em{background:linear-gradient(135deg,#7C3AED,#6D28D9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
/* Scrollbar */
.light-mode ::-webkit-scrollbar-thumb{background:#C0D0EE;}
/* Bottom nav */
.light-mode .mnav{background:#FFFFFF;border-color:rgba(0,60,180,0.09);}
.light-mode .mni-lbl{color:#2A3F6A;}
.light-mode .mni.on .mni-lbl{color:#0055DD;}
.light-mode .mni:active{background:rgba(0,60,180,0.04);}
.light-mode .tdot{background:#0055DD;box-shadow:0 0 5px rgba(0,80,200,0.5);}
.light-mode .bpday{color:#06102A;}
.light-mode .bpdate{color:#2A3F6A;}
.light-mode .bptyp{color:#06102A;}
.light-mode .goal-date{color:#2A3F6A;}
.light-mode .note-meta{color:#2A3F6A;}
.light-mode .sr-desc{color:#2A3F6A;}
.light-mode .tdsc{color:#2A3F6A;}
.light-mode .ms{color:#2A3F6A;}
.light-mode .pdate{color:#2A3F6A;}
.light-mode .mob-wbadge.ok{background:#0044CC;box-shadow:0 0 5px rgba(0,60,200,0.4);}

html,body{height:100%;background:var(--bg);color:var(--t);font-family:var(--font);-webkit-font-smoothing:antialiased;overflow:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:2px}

/* ── Shell ── */
.app{display:flex;height:100vh;overflow:hidden}

/* ── Sidebar ── */
.sb{width:var(--sb);min-width:var(--sb);background:var(--bg2);border-right:1px solid var(--b);
  display:flex;flex-direction:column;padding:22px 0 14px;flex-shrink:0}
.logo{padding:0 18px 20px;font-size:19px;font-weight:800;letter-spacing:-0.5px}
.logo em{color:var(--a);font-style:normal}
.ns{font-size:8px;font-weight:700;letter-spacing:3px;color:var(--m);padding:0 18px 5px;text-transform:uppercase}
.ni{display:flex;align-items:center;gap:9px;padding:9px 18px;font-size:13px;font-weight:600;
  color:var(--m2);cursor:pointer;border-left:2px solid transparent;transition:all .15s;position:relative;
  user-select:none;-webkit-user-select:none}
.ni:hover{color:var(--t);background:rgba(255,255,255,.02)}
.ni.on{color:var(--a);border-left-color:var(--a);background:rgba(92,255,176,.04)}
.ni .sn{margin-left:auto;font-size:8px;font-weight:700;color:var(--m);background:var(--bg4);padding:2px 5px;border-radius:3px}
.sb-foot{margin-top:auto;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.streak-sb{background:var(--bg3);border:1px solid rgba(92,255,176,.15);border-radius:9px;
  padding:8px 11px;display:flex;align-items:center;gap:8px}
.streak-num{font-size:17px;font-weight:800;font-family:var(--mono);color:var(--a2);line-height:1}
.streak-lbl{font-size:9px;color:var(--m2)}
.wbadge{font-size:10px;padding:4px 9px;border-radius:6px;text-align:center;
  background:rgba(255,107,107,.08);color:var(--warn);border:1px solid rgba(255,107,107,.15)}
.wbadge.ok{background:rgba(92,255,176,.06);color:var(--a);border-color:rgba(92,255,176,.12)}

/* ── Main ── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.mob-header{display:none}
.topbar{padding:16px 20px 0;display:flex;align-items:flex-end;justify-content:space-between;flex-shrink:0}
.ptitle{font-size:21px;font-weight:800;letter-spacing:-0.5px;line-height:1}
.ptitle em{background:linear-gradient(135deg,var(--a),var(--a2));-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text;font-style:normal}
.pdate{font-size:10px;color:var(--m);font-family:var(--mono);padding-bottom:2px}
.subnav{display:flex;gap:0;padding:10px 20px 0;border-bottom:1px solid var(--b);
  overflow-x:auto;scrollbar-width:none;flex-shrink:0}
.subnav::-webkit-scrollbar{display:none}
.sni{padding:8px 13px;font-size:12px;font-weight:700;color:var(--m);cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;transition:all .15s;
  user-select:none;-webkit-user-select:none}
.sni:hover{color:var(--t)}.sni.on{color:var(--a);border-bottom-color:var(--a)}
.tab-content{flex:1;overflow:hidden;display:flex;flex-direction:column}
.cnt{padding:16px 20px 40px;flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}

/* ── Cards ── */
.card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:14px 16px;margin-bottom:10px}
.card-glow{box-shadow:var(--glow);border-color:rgba(92,255,176,.15)}
.ctitle{font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--m);text-transform:uppercase;margin-bottom:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* ── AI box ── */
.aib{background:linear-gradient(135deg,rgba(92,255,176,.04),rgba(92,158,255,.03));
  border:1px solid rgba(92,255,176,.15);border-radius:var(--r);padding:12px 14px;margin-top:10px;
  animation:fadeup .3s ease}
@keyframes fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.aib-t{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--a);margin-bottom:7px;display:flex;align-items:center;gap:5px}
.aib p{font-size:12.5px;line-height:1.8;color:var(--m2);white-space:pre-wrap}

/* ── Today tasks ── */
.tgl{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--m);margin:14px 0 7px;display:flex;align-items:center;gap:7px}
.tgl::after{content:'';flex:1;height:1px;background:var(--b)}
.ti{display:flex;align-items:center;gap:11px;padding:13px 13px;
  background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);
  cursor:pointer;transition:all .2s;margin-bottom:7px;position:relative;overflow:hidden}
.ti::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(92,255,176,.03),transparent);
  opacity:0;transition:opacity .2s}
.ti:hover{border-color:var(--b2);transform:translateX(3px)}
.ti:hover::before{opacity:1}
.ti.done{opacity:.4;pointer-events:none}
.tic{font-size:19px;width:38px;height:38px;background:var(--bg3);border-radius:9px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tinfo{flex:1;min-width:0}
.tlbl{font-size:13px;font-weight:700;line-height:1.2}
.tdsc{font-size:11px;color:var(--m2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tbdg{font-size:9px;font-weight:700;padding:3px 8px;border-radius:20px;flex-shrink:0}
.tbdg.p{background:rgba(255,255,255,.05);color:var(--m)}
.tbdg.d{background:rgba(92,255,176,.12);color:var(--a)}
.streak-banner{display:flex;align-items:center;gap:12px;padding:12px 14px;
  background:linear-gradient(135deg,rgba(92,255,176,.08),rgba(92,158,255,.05));
  border:1px solid rgba(92,255,176,.2);border-radius:var(--r);margin-bottom:14px;
  animation:fadeup .4s ease}
.streak-count{font-size:26px;font-weight:800;font-family:var(--mono);
  background:linear-gradient(135deg,var(--a),var(--a2));-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text;line-height:1}
.streak-msg{font-size:11.5px;color:var(--m2);flex:1;line-height:1.6}

/* ── Recovery ring ── */
.rc-wrap{display:flex;align-items:center;gap:14px;padding:12px 14px;
  background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);margin-bottom:14px}
.rc-ring{width:54px;height:54px;flex-shrink:0;position:relative}
.rc-ring svg{transform:rotate(-90deg)}
.rc-ring-lbl{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.rc-num{font-size:15px;font-weight:800;font-family:var(--mono)}
.rc-txt{font-size:8px;color:var(--m);letter-spacing:1px}
.rc-info{flex:1}
.rc-title{font-size:13px;font-weight:700}
.rc-sub{font-size:11px;color:var(--m2);margin-top:2px}

/* ── Blueprint ── */
.bpr{display:flex;align-items:center;padding:11px 13px;background:var(--bg2);
  border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:all .18s;margin-bottom:6px;gap:8px}
.bpr:hover{border-color:var(--b2);background:rgba(255,255,255,.02)}
.bpr.today{border-color:rgba(92,255,176,.3);background:rgba(92,255,176,.03);box-shadow:var(--glow)}
.bpr.rest{opacity:.45;cursor:default}
.bp-date-col{display:flex;flex-direction:column;width:46px;flex-shrink:0}
.bpday{font-size:12px;font-weight:800;color:var(--t)}
.bpdate{font-size:9px;color:var(--m);font-family:var(--mono)}
.bpctx{font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;flex-shrink:0;white-space:nowrap}
.cw{background:rgba(92,158,255,.12);color:#7ABAFF}
.cc{background:rgba(180,100,255,.12);color:#CC88FF}
.cb{background:rgba(255,107,107,.12);color:#FF8A8A}
.co{background:rgba(92,255,176,.12);color:var(--a)}
.cr{background:rgba(255,255,255,.05);color:var(--m)}
.bptyp{font-size:12.5px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bpwin{font-size:9px;color:var(--m);font-family:var(--mono);flex-shrink:0;white-space:nowrap}
.tdot{width:5px;height:5px;border-radius:50%;background:var(--a);flex-shrink:0;
  box-shadow:0 0 6px var(--a);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

/* ── Workout detail ── */
.ex-section{margin-bottom:11px}
.ex-section-title{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--m2);margin-bottom:5px;padding:5px 0;border-bottom:1px solid var(--b)}
.exr{display:flex;align-items:center;gap:8px;padding:7px 10px;
  background:var(--bg3);border-radius:8px;margin-bottom:4px;transition:background .15s}
.exr:hover{background:var(--bg4)}
.exn{flex:1;font-size:12.5px;font-weight:500}
.exrp{font-size:11px;color:var(--a);font-family:var(--mono);background:rgba(92,255,176,.08);
  padding:2px 7px;border-radius:5px}
.exnote{font-size:10px;color:var(--m);font-style:italic}

/* ── Goals ── */
.goal-input-wrap{display:flex;gap:7px;margin-bottom:12px}
.goal-input{flex:1;background:var(--bg2);border:1px solid var(--b);border-radius:9px;
  padding:10px 12px;color:var(--t);font-family:var(--font);font-size:13px;
  outline:none;transition:border-color .15s}
.goal-input:focus{border-color:rgba(92,255,176,.4);box-shadow:0 0 0 3px rgba(92,255,176,.06)}
.goal-input::placeholder{color:var(--m)}
.goal-card{background:var(--bg2);border:1px solid var(--b);border-radius:var(--r);padding:12px 14px;margin-bottom:7px;animation:fadeup .25s ease}
.goal-card.done{opacity:.35}
.goal-text{font-size:13px;font-weight:700;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px}
.goal-date{font-size:9px;color:var(--m);font-family:var(--mono);margin-bottom:7px}
.goal-ai{font-size:12px;color:var(--m2);line-height:1.7;background:var(--bg3);padding:9px 11px;border-radius:8px;white-space:pre-wrap}
.gc-btn{background:none;border:none;cursor:pointer;color:var(--m);font-size:13px;padding:2px 4px;transition:color .15s;flex-shrink:0}
.gc-btn:hover{color:var(--warn)}

/* ── Notes ── */
.processed-note{background:linear-gradient(135deg,rgba(92,255,176,.04),rgba(92,158,255,.03));
  border:1px solid rgba(92,255,176,.13);border-radius:var(--r);padding:12px 14px;
  margin-bottom:8px;animation:fadeup .3s ease}
.pn-meta{font-size:9px;color:var(--a);font-family:var(--mono);margin-bottom:6px;
  display:flex;align-items:center;gap:5px}
.pn-body{font-size:12.5px;line-height:1.75;color:var(--m2);white-space:pre-wrap}

/* ── Settings ── */
.settings-section{margin-bottom:20px}
.settings-title{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--m);margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--b)}
.setting-row{display:flex;align-items:center;justify-content:space-between;
  padding:11px 14px;background:var(--bg2);border:1px solid var(--b);
  border-radius:10px;margin-bottom:6px;gap:10px}
.setting-row:last-child{margin-bottom:0}
.sr-left{flex:1;min-width:0}
.sr-label{font-size:13px;font-weight:600}
.sr-desc{font-size:11px;color:var(--m2);margin-top:2px;line-height:1.5}
.toggle{width:40px;height:22px;background:var(--bg4);border-radius:11px;
  position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;border:1px solid var(--b)}
.toggle.on{background:var(--a)}
.toggle-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;
  background:#fff;border-radius:50%;transition:left .2s}
.toggle.on .toggle-thumb{left:20px;background:var(--bg)}
.danger-zone{background:rgba(255,107,107,.04);border:1px solid rgba(255,107,107,.15);
  border-radius:var(--r);padding:14px 16px}
.danger-title{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--warn);margin-bottom:10px}

/* ── Inputs ── */
.ta{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:9px;
  padding:11px 13px;color:var(--t);font-family:var(--font);font-size:13px;
  line-height:1.6;resize:vertical;outline:none;transition:all .15s;min-height:90px}
.ta:focus{border-color:rgba(92,255,176,.4);box-shadow:0 0 0 3px rgba(92,255,176,.05)}
.inp{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:9px;
  padding:10px 12px;color:var(--t);font-family:var(--font);font-size:13px;
  outline:none;transition:all .15s}
.inp:focus{border-color:rgba(92,255,176,.4);box-shadow:0 0 0 3px rgba(92,255,176,.05)}
.inp::placeholder{color:var(--m)}
.sel{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:9px;
  padding:10px 12px;color:var(--t);font-family:var(--font);font-size:13px;outline:none;
  cursor:pointer;appearance:none;-webkit-appearance:none}

/* ── Modals ── */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;
  align-items:center;justify-content:center;z-index:200;padding:16px;animation:fi .15s}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:var(--bg2);border:1px solid var(--b);border-radius:16px;
  width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:su .22s ease}
@keyframes su{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
.mh{padding:16px 18px 13px;border-bottom:1px solid var(--b);
  display:flex;align-items:flex-start;justify-content:space-between}
.mt{font-size:15px;font-weight:800}
.ms{font-size:11px;color:var(--m2);margin-top:3px;font-family:var(--mono)}
.mcl{background:var(--bg4);border:none;color:var(--m2);width:28px;height:28px;
  border-radius:7px;cursor:pointer;font-size:16px;display:flex;
  align-items:center;justify-content:center;flex-shrink:0;line-height:1;transition:all .15s}
.mcl:hover{color:var(--t);background:var(--bg3)}
.mb{padding:14px 18px}
.mf{padding:10px 18px 15px;border-top:1px solid var(--b);display:flex;gap:8px}

/* ── Upload ── */
.uz{border:2px dashed var(--b);border-radius:var(--r);padding:20px 16px;
  text-align:center;cursor:pointer;transition:all .2s;margin-bottom:9px}
.uz:hover{border-color:var(--a);background:rgba(92,255,176,.02)}
.upr{width:100%;max-height:140px;object-fit:contain;border-radius:9px;margin-bottom:8px;border:1px solid var(--b)}
.upload-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.upload-half{border:1px dashed var(--b);border-radius:10px;padding:14px 10px;
  text-align:center;cursor:pointer;transition:all .2s;min-height:88px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.upload-half:hover{border-color:var(--a);background:rgba(92,255,176,.02)}
.upload-half.has{border-color:rgba(92,255,176,.35);background:rgba(92,255,176,.04)}
.upload-half img{width:100%;max-height:70px;object-fit:contain;border-radius:6px}
.upload-half-lbl{font-size:10.5px;color:var(--m2);font-weight:600}

/* ── Buttons ── */
.btn{padding:10px 14px;border-radius:9px;font-family:var(--font);font-size:13px;
  font-weight:700;cursor:pointer;border:none;transition:all .18s;
  display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
.bp{background:linear-gradient(135deg,var(--a),#3DDFAA);color:#030310;flex:1}
.bp:hover{filter:brightness(1.08);transform:translateY(-1px)}
.bp:active{transform:translateY(0)}
.bp:disabled{opacity:.45;cursor:not-allowed;transform:none;filter:none}
.bs{background:var(--bg3);color:var(--t);border:1px solid var(--b);flex:1}
.bs:hover{border-color:var(--b2);background:var(--bg4)}
.bwarn{background:rgba(255,107,107,.1);color:var(--warn);border:1px solid rgba(255,107,107,.25);flex:1}
.bwarn:hover{background:rgba(255,107,107,.18)}
.bsm{flex:none;padding:8px 12px;font-size:11.5px}

/* ── Misc ── */
.dots{display:inline-flex;gap:3px}
.dots span{width:4px;height:4px;border-radius:50%;background:var(--a);animation:bop 1.1s infinite}
.dots span:nth-child(2){animation-delay:.18s}.dots span:nth-child(3){animation-delay:.36s}
@keyframes bop{0%,80%,100%{transform:scale(0.5)}40%{transform:scale(1)}}

/* ── Animations ── */
@keyframes fadeup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes slideright{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
@keyframes popin{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* Tab content fades in on switch */
.tab-content > *{animation:fadeup .22s ease}

/* Cards animate in staggered */
.card{animation:fadeup .2s ease}
.ti{animation:slideright .18s ease}
.ti:nth-child(2){animation-delay:.04s}
.ti:nth-child(3){animation-delay:.08s}
.bpr{animation:slideright .16s ease}
.bpr:nth-child(2){animation-delay:.03s}
.bpr:nth-child(3){animation-delay:.06s}
.bpr:nth-child(4){animation-delay:.09s}
.bpr:nth-child(5){animation-delay:.12s}
.bpr:nth-child(6){animation-delay:.15s}
.bpr:nth-child(7){animation-delay:.18s}
.goal-card{animation:fadeup .18s ease}
.goal-card:nth-child(2){animation-delay:.05s}
.goal-card:nth-child(3){animation-delay:.1s}
.note-card{animation:fadeup .18s ease}
.processed-note{animation:fadeup .25s ease}

/* Sidebar nav items */
.ni{transition:all .15s cubic-bezier(.4,0,.2,1)}
.ni.on{animation:slideright .18s ease}

/* Mobile nav icons bounce on tap */
.mni{transition:background .15s}
.mni.on .mni-ico{animation:popin .2s cubic-bezier(.34,1.56,.64,1)}

/* Buttons press animation */
.btn:active{transform:scale(0.97) translateY(1px)}
.bp:active{transform:scale(0.97) translateY(1px)}

/* AI box slides up */
.aib{animation:fadeup .3s cubic-bezier(.4,0,.2,1)}

/* Modal pops in */
.modal{animation:popin .22s cubic-bezier(.34,1.2,.64,1)}

/* Recovery ring draws in */
.rc-ring svg circle:last-child{animation:fadein .8s ease}

/* Streak banner slides up */
.streak-banner{animation:fadeup .35s cubic-bezier(.4,0,.2,1)}

/* Skeleton loading shimmer */
.skeleton{
  background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);
  background-size:200% 100%;
  animation:shimmer 1.5s infinite;
  border-radius:6px;
}

.err-banner{padding:8px 12px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.18);
  border-radius:8px;font-size:12px;color:var(--warn);margin-bottom:10px}
.cs-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:260px;text-align:center;gap:7px;padding:20px}
.cs-list{margin-top:10px;display:flex;flex-direction:column;gap:5px;width:100%;max-width:260px}
.cs-item{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);
  border:1px solid var(--b);border-radius:8px;font-size:12px;color:var(--m2)}
.cs-badge{margin-top:12px;padding:6px 14px;background:rgba(92,255,176,.06);
  border:1px solid rgba(92,255,176,.13);border-radius:7px;font-size:11.5px;color:var(--a);font-weight:600}
.empty-state{text-align:center;padding:30px 0;color:var(--m);font-size:12.5px;line-height:1.8}

/* ════════════════════════
   MOBILE ≤ 768px
   ════════════════════════ */
@media(max-width:768px){
  html,body{overflow:hidden;height:100dvh}
  .sb{display:none}
  .topbar{display:none}
  .app{flex-direction:column;height:100dvh}

  /* Mobile header */
  .mob-header{
    display:flex;align-items:center;padding:0 15px;
    height:var(--mob-header);min-height:var(--mob-header);
    background:var(--bg2);border-bottom:1px solid var(--b);
    flex-shrink:0;gap:8px;
  }
  .mob-logo{font-size:17px;font-weight:800;letter-spacing:-0.5px;flex:1}
  .mob-logo em{background:linear-gradient(135deg,var(--a),var(--a2));
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-style:normal}
  .mob-date{font-size:10px;color:var(--m);font-family:var(--mono)}
  .mob-streak{display:flex;align-items:center;gap:3px;font-size:12px;font-weight:800;
    color:var(--a);font-family:var(--mono);background:rgba(92,255,176,.08);
    border:1px solid rgba(92,255,176,.15);border-radius:20px;padding:3px 8px}
  .mob-wbadge{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .mob-wbadge.ok{background:var(--a);box-shadow:0 0 6px var(--a)}
  .mob-wbadge.err{background:var(--warn)}

  .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0}
  .tab-content{flex:1;overflow:hidden;display:flex;flex-direction:column}
  .cnt{padding:13px 13px calc(var(--mob-nav) + 18px) 13px;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .subnav{padding:0 13px;background:var(--bg2)}
  .sni{padding:9px 9px;font-size:11px}

  /* Bottom nav */
  .mnav{
    display:flex;position:fixed;bottom:0;left:0;right:0;
    height:var(--mob-nav);background:var(--bg2);border-top:1px solid var(--b);
    z-index:100;padding-bottom:env(safe-area-inset-bottom,0px);
  }
  .mni{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:5px 2px 3px;cursor:pointer;gap:3px;position:relative;transition:background .15s;
    user-select:none;-webkit-user-select:none}
  .mni:active{background:rgba(255,255,255,.03)}
  .mni-ico{font-size:21px;line-height:1;transition:transform .2s}
  .mni.on .mni-ico{transform:scale(1.18)}
  .mni-lbl{font-size:8.5px;font-weight:700;color:var(--m);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
  .mni.on .mni-lbl{color:var(--a)}
  .mni-pip{position:absolute;top:4px;right:18%;width:5px;height:5px;border-radius:50%;background:var(--warn);box-shadow:0 0 5px var(--warn)}

  /* Layout */
  .g2{grid-template-columns:1fr}
  .upload-pair{grid-template-columns:1fr 1fr}
  .ti{padding:13px 12px;border-radius:11px}
  .tic{width:39px;height:39px;font-size:18px}
  .tlbl{font-size:13.5px}
  .bpr{padding:11px 12px}
  .goal-input-wrap{flex-direction:column}

  /* Modals → bottom sheet */
  .ov{padding:0;align-items:flex-end}
  .modal{max-width:100%;width:100%;border-radius:20px 20px 0 0;max-height:90dvh}
  .mh{padding:16px 16px 12px}
  .mb{padding:12px 15px}
  .mf{padding:10px 15px 15px;flex-direction:column}
  .mf .bs,.mf .bp,.mf .bwarn{flex:none;width:100%}
  .btn{padding:12px 14px;font-size:13.5px}

  /* Settings */
  .setting-row{padding:12px 13px}
}

@media(max-width:360px){
  .mni-ico{font-size:19px}
  .mni-lbl{font-size:8px}
  .cnt{padding:11px 11px calc(var(--mob-nav) + 16px) 11px}
  .upload-pair{grid-template-columns:1fr}
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [pw, setPw]           = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const login = async () => {
    if (!pw.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${WORKER_URL}/auth/login`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setError("Wrong password."); setLoading(false); return; }
      localStorage.setItem("lifeos_token", data.token);
      stampActivity();
      onLogin();
    } catch { setError("Could not reach server."); }
    setLoading(false);
  };

  return (
    <div
      style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"var(--bg)",flexDirection:"column",padding:20,fontFamily:"var(--font)"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:340,background:"var(--bg2)",border:"1px solid var(--b)",
        borderRadius:18,padding:"30px 22px",display:"flex",flexDirection:"column",gap:13}}>
        <div style={{textAlign:"center",marginBottom:4}}>
          <div style={{fontSize:30,fontWeight:800,letterSpacing:-1,color:"var(--t)",lineHeight:1}}>
            Life<span style={{background:"linear-gradient(135deg,#5CFFB0,#5C9EFF)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>OS</span>
          </div>
          <div style={{fontSize:11,color:"var(--m)",marginTop:6}}>Personal Life Dashboard</div>
        </div>
        <div style={{height:1,background:"var(--b)"}}/>
        <input type="password" placeholder="Password" value={pw} autoFocus
          onChange={e=>{setPw(e.target.value);setError("");}}
          onKeyDown={e=>e.key==="Enter"&&login()}
          style={{width:"100%",padding:"11px 13px",background:"var(--bg3)",
            border:"1px solid var(--b)",borderRadius:9,color:"var(--t)",
            fontFamily:"var(--font)",fontSize:14,outline:"none"}}/>
        {error && <div style={{fontSize:12,color:"var(--warn)",textAlign:"center",
          background:"rgba(255,107,107,.08)",padding:"7px 10px",borderRadius:7,
          border:"1px solid rgba(255,107,107,.2)"}}>{error}</div>}
        <button onClick={login} disabled={loading||!pw.trim()}
          style={{width:"100%",padding:"12px",background:loading||!pw.trim()?"var(--bg4)":"linear-gradient(135deg,#5CFFB0,#3DDFAA)",
            border:"none",borderRadius:9,color:loading||!pw.trim()?"var(--m)":"#030310",
            fontFamily:"var(--font)",fontSize:14,fontWeight:700,cursor:loading||!pw.trim()?"not-allowed":"pointer",
            transition:"all .2s"}}>
          {loading?"Checking…":"Unlock →"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════════════════════════
function Dots() { return <div className="dots"><span/><span/><span/></div>; }
function Err({ msg }) { return msg ? <div className="err-banner">⚠ {msg}</div> : null; }
function stripStars(text) {
  if (!text) return '';
  // Nuclear: remove every single asterisk — AI is told not to use markdown
  // Any remaining * is always garbage so we just delete them all
  return text.replace(/\*/g, '');
}

function parseBold(line) {
  return stripStars(line);
}

function renderAI(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line → small gap
    if (!trimmed) {
      elements.push(<div key={key++} style={{height:4}}/>);
      continue;
    }

    // Strip stars from trimmed line before any detection
    const clean = stripStars(trimmed);

    // Section headers: short ALL-CAPS lines ending with colon e.g. "SLEEP METRICS:"
    if (/^[A-Z][A-Z\s\/\-]+:$/.test(clean) && clean.length < 60) {
      elements.push(
        <div key={key++} style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",
          textTransform:"uppercase",color:"var(--a)",marginTop:12,marginBottom:4,
          paddingBottom:3,borderBottom:"1px solid var(--b)"}}>
          {clean.replace(/:$/, '')}
        </div>
      );
      continue;
    }

    // Bullet lines: starts with "- ", "• ", or "· " (stars already stripped so no * here)
    const isBullet = /^[-•·]\s/.test(clean);
    if (isBullet) {
      const stripped = clean.replace(/^[-•·]\s+/, '');
      elements.push(
        <div key={key++} style={{display:"flex",gap:8,marginBottom:4,paddingLeft:2,alignItems:"flex-start"}}>
          <span style={{color:"var(--a)",flexShrink:0,fontSize:14,lineHeight:"1.6",marginTop:1}}>·</span>
          <span style={{fontSize:12.5,lineHeight:1.7,color:"var(--m2)",flex:1}}>{stripped}</span>
        </div>
      );
      continue;
    }

    // Normal line — clean already has stars stripped
    elements.push(
      <div key={key++} style={{fontSize:12.5,lineHeight:1.75,color:"var(--m2)",marginBottom:2}}>
        {clean}
      </div>
    );
  }
  return elements;
}

function AiBox({ label, text }) {
  if (!text) return null;
  return (
    <div className="aib">
      <div className="aib-t">✦ {label}</div>
      <div>{renderAI(text)}</div>
    </div>
  );
}
function ComingSoon({ icon, label, desc, items=[] }) {
  return (
    <div className="cs-wrap">
      <div style={{fontSize:38,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:16,fontWeight:800}}>{label}</div>
      <div style={{fontSize:12,color:"var(--m2)",maxWidth:270,lineHeight:1.65}}>{desc}</div>
      {items.length>0&&<div className="cs-list">{items.map((x,i)=>(
        <div key={i} className="cs-item"><span>{x.icon}</span><span style={{flex:1}}>{x.label}</span>
          <span style={{fontSize:8,color:"var(--m)",background:"var(--bg3)",padding:"2px 5px",borderRadius:3}}>SOON</span>
        </div>
      ))}</div>}
      <div className="cs-badge">Coming soon</div>
    </div>
  );
}
function UploadZone({ label, file, setFile, preview, setPreview }) {
  const ref = useRef();
  const pick = f => { if(!f)return; setFile(f); setPreview(URL.createObjectURL(f)); };
  return (
    <div className={"upload-half"+(preview?" has":"")} onClick={()=>ref.current?.click()}>
      {preview?<img src={preview} alt={label}/>:<div style={{fontSize:22}}>📸</div>}
      <div className="upload-half-lbl">{preview?"✓ "+label:label}</div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>pick(e.target.files[0])}/>
    </div>
  );
}

// Recovery ring
function extractScore(dayData) {
  if (!dayData) return null;
  // Parse from analysis text — source of truth
  const text = dayData.combined_analysis || "";
  const tries = [
    text.match(/RECOVERY SCORE[^0-9]*([0-9]+)/i),
    text.match(/Recovery Score[^0-9]*([0-9]+)/i),
    text.match(/([0-9]+)\s*\/\s*100/),
    text.match(/score[^0-9]*([0-9]+)/i),
  ];
  for (const m of tries) {
    if (m) { const n = parseInt(m[1]); if (n > 0 && n <= 100) return n; }
  }
  // Fall back to DB value only if it's not the stale default of 70
  const db = dayData.recovery_score;
  if (db && db !== 70) return db;
  return null;
}

const MODULE_CONFIG = {
  fitness: { color:"var(--fitness-color)", bg:"var(--fitness-bg)", border:"var(--fitness-border)", icon:"🏋️", label:"Fitness" },
  skills:  { color:"var(--skills-color)",  bg:"var(--skills-bg)",  border:"var(--skills-border)",  icon:"📚", label:"Skills"  },
  hobbies: { color:"var(--hobbies-color)", bg:"var(--hobbies-bg)", border:"var(--hobbies-border)", icon:"🎨", label:"Hobbies" },
};

function RecoveryRingFromData({ dayData }) {
  const score = extractScore(dayData);
  if (!score) return null;
  return <RecoveryRing score={score}/>;
}

function RecoveryRing({ score }) {
  if (!score) return null;
  const color = score>=80?"var(--a)":score>=55?"var(--gold)":"var(--warn)";
  const r=22, circ=2*Math.PI*r, dash=(score/100)*circ;
  return (
    <div className="rc-wrap">
      <div className="rc-ring">
        <svg width="54" height="54" viewBox="0 0 54 54">
          <circle cx="27" cy="27" r={r} fill="none" stroke="var(--bg4)" strokeWidth="4"/>
          <circle cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
        <div className="rc-ring-lbl">
          <div className="rc-num" style={{color}}>{score}</div>
          <div className="rc-txt">REC</div>
        </div>
      </div>
      <div className="rc-info">
        <div className="rc-title">Recovery Score</div>
        <div className="rc-sub">{score>=80?"Ready to push hard":score>=55?"Moderate effort today":"Take it easy today"}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TODAY TAB
// ═══════════════════════════════════════════════════════════════════════════════
// SessionCompleteCard removed — DayDetailModal handles all session completion

function TodayTab({ streak, weekPlan }) {
  const today = todayStr();
  const [dayData, setDayData]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [streaks, setStreaks]       = useState({});
  const [lifeScore, setLifeScore]   = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null); // task id expanded
  const [completingTask, setCompletingTask] = useState(null);
  const [nextWeekPlan, setNextWeekPlan]     = useState(undefined); // undefined=loading, null=none
  const [bodyCompThisWeek, setBodyCompThisWeek] = useState(null);

  const ws = weekStart(today);
  // Next week start = ws + 7 days
  const nextWs = (() => {
    const d = new Date(ws + "T12:00:00");
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0,10);
  })();
  const todayDayAbbr = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
  const freeDayNum = parseInt(localStorage.getItem("lifeos_free_day") || "0");
  const isFreeDay = new Date().getDay() === freeDayNum;

  const load = useCallback(async () => {
    try {
      const [d, s, ls] = await Promise.all([
        api("/data/day/" + today),
        api("/module/streaks"),
        api("/life/score?week_start=" + ws),
      ]);
      setDayData(d);
      setStreaks(s.streaks || {});
      setLifeScore(ls.score);
    } catch { setDayData(null); }
    setLoading(false);
  }, [today, ws]);

  // Check next week plan + body comp (for reminders) — runs independently
  useEffect(() => {
    api("/data/week/" + nextWs)
      .then(d => setNextWeekPlan(d?.fitness?.days?.length > 0 ? d : null))
      .catch(() => setNextWeekPlan(null));
    api("/data/body-comp-latest")
      .then(d => setBodyCompThisWeek(d?.week_start || null))
      .catch(() => setBodyCompThisWeek(null));
  }, [nextWs]);

  useEffect(() => { load(); }, [load]);

  const onAnalysisDone = (res) => {
    setDayData(d => ({...(d||{}), combined_analysis:res.analysis, recovery_score:res.recovery_score}));
    setUploadOpen(false);
  };

  // Build time-sorted task list from all modules
  const buildTasks = () => {
    const tasks = [];
    // Sleep upload always first
    tasks.push({
      id: "sleep", module: "fitness", icon: "🌙",
      label: "Upload Sleep + Activity",
      desc: "Samsung Health screenshots",
      time: "00:00", // always sorts first
      done: !!dayData?.combined_analysis,
      onTap: () => setUploadOpen(true),
    });
    // Module sessions for today
    for (const mod of ["fitness","skills","hobbies"]) {
      const plan = weekPlan?.[mod]?.days;
      if (!plan) continue;
      const todayPlan = plan.find(d => d.day?.slice(0,3) === todayDayAbbr);
      if (!todayPlan || todayPlan.is_rest) continue;
      const cfg = MODULE_CONFIG[mod];
      // Check if completed today
      const sessionDone = false; // would need to track per-module completion
      tasks.push({
        id: mod + "_session",
        module: mod,
        icon: cfg.icon,
        label: todayPlan.session_name || (cfg.label + " Session"),
        desc: todayPlan.time_window ? todayPlan.time_window + " · " + cfg.label : cfg.label,
        time: todayPlan.time_window ? todayPlan.time_window.split("-")[0].trim() : "12:00",
        sessionFocus: todayPlan.session_detail || todayPlan.ai_note || "",
        day: todayPlan,
        done: sessionDone,
        onTap: () => {
          setExpandedTask(t => t === mod+"_session" ? null : mod+"_session");
        },
      });
    }
    // Sort by time
    tasks.sort((a,b) => {
      const toMins = t => { const [h,m] = t.replace(/[apm]/gi,"").split(":").map(Number); return (h||0)*60+(m||0); };
      return toMins(a.time) - toMins(b.time);
    });
    return tasks;
  };

  const tasks = buildTasks();
  const doneTasks = tasks.filter(t => t.done).length;
  const totalTasks = tasks.length;

  const scoreColor = !lifeScore ? "var(--m)" : lifeScore >= 70 ? "var(--a)" : lifeScore >= 50 ? "var(--gold)" : "var(--warn)";

  if (loading) return (
    <div className="cnt" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}><Dots/></div>
  );

  // Reminder banners — only show on free day OR if schedule is critically missing
  const needsSchedule = nextWeekPlan === null; // null = loaded but no plan
  const daysSinceBodyComp = bodyCompThisWeek
    ? Math.floor((new Date(today) - new Date(bodyCompThisWeek + "T12:00:00")) / 86400000)
    : 99;
  const needsBodyComp = daysSinceBodyComp >= 7;
  const showReminders = isFreeDay || needsSchedule; // always show if schedule missing

  return (
    <div className="cnt">

      {/* Reminder banners */}
      {showReminders && needsSchedule && (
        <div style={{
          background:"linear-gradient(135deg,var(--fitness-bg),var(--bg2))",
          border:"1px solid var(--fitness-border)",
          borderRadius:10, padding:"12px 14px", marginBottom:10,
          display:"flex", alignItems:"center", gap:12,
          animation:"fadeup .3s ease"
        }}>
          <div style={{fontSize:22,flexShrink:0}}>📅</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--fitness-color)",marginBottom:2}}>
              Next week has no schedule yet
            </div>
            <div style={{fontSize:11,color:"var(--m)",lineHeight:1.55}}>
              Upload your schedule in Settings — all 3 modules generate automatically.
            </div>
          </div>
          <button className="btn bp bsm"
            style={{flexShrink:0,background:"var(--fitness-color)",fontSize:11}}
            onClick={()=>{ /* open settings tab via a custom event */ window.dispatchEvent(new CustomEvent("lifeos:gotab",{detail:"settings"})); }}>
            Upload
          </button>
        </div>
      )}

      {showReminders && needsBodyComp && (
        <div style={{
          background:"linear-gradient(135deg,var(--skills-bg),var(--bg2))",
          border:"1px solid var(--skills-border)",
          borderRadius:10, padding:"12px 14px", marginBottom:10,
          display:"flex", alignItems:"center", gap:12,
          animation:"fadeup .3s ease"
        }}>
          <div style={{fontSize:22,flexShrink:0}}>📐</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--skills-color)",marginBottom:2}}>
              Body composition not logged this week
            </div>
            <div style={{fontSize:11,color:"var(--m)",lineHeight:1.55}}>
              {daysSinceBodyComp < 99
                ? `Last logged ${daysSinceBodyComp} day${daysSinceBodyComp!==1?"s":""} ago. Go to Settings → Tracking to upload today's.`
                : "Never logged. Upload a Samsung Health body comp screenshot to start tracking."}
            </div>
          </div>
          <button className="btn bs bsm"
            style={{flexShrink:0,fontSize:11}}
            onClick={()=>window.dispatchEvent(new CustomEvent("lifeos:gotab",{detail:"settings"}))}>
            Log
          </button>
        </div>
      )}

      {/* Life Score */}
      {lifeScore !== null && (
        <div style={{background:"var(--bg2)",border:"1px solid var(--b)",borderRadius:12,
          padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
          <div style={{textAlign:"center",minWidth:54}}>
            <div style={{fontSize:28,fontWeight:800,fontFamily:"var(--mono)",color:scoreColor,lineHeight:1}}>{lifeScore}</div>
            <div style={{fontSize:9,color:"var(--m)",letterSpacing:"1.5px",textTransform:"uppercase",marginTop:2}}>Life Score</div>
          </div>
          <div style={{flex:1}}>
            <div style={{height:6,background:"var(--bg4)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:lifeScore+"%",background:scoreColor,borderRadius:3,transition:"width .6s ease"}}/>
            </div>
            <div style={{fontSize:11,color:"var(--m2)",marginTop:5}}>
              {lifeScore>=70?"Strong week across all modules":lifeScore>=50?"Making progress — keep going":"Low activity — let's get moving"}
            </div>
          </div>
        </div>
      )}

      {/* Streak row — 3 boxes */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {["fitness","skills","hobbies"].map(mod => {
          const cfg = MODULE_CONFIG[mod];
          const s = streaks[mod];
          return (
            <div key={mod} style={{background:"var(--bg2)",border:"1px solid var(--b)",
              borderRadius:10,padding:"10px 11px",textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:2}}>{cfg.icon}</div>
              <div style={{fontSize:20,fontWeight:800,fontFamily:"var(--mono)",
                color:s?.count>0?cfg.color:"var(--m)",lineHeight:1}}>
                {s?.count||0}
              </div>
              <div style={{fontSize:9,color:"var(--m)",textTransform:"uppercase",letterSpacing:"1px",marginTop:2}}>
                {cfg.label}
              </div>
              {s?.count>0 && <div style={{fontSize:9,color:cfg.color,marginTop:1}}>day streak 🔥</div>}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{flex:1,height:4,background:"var(--bg4)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:(doneTasks/totalTasks*100)+"%",background:"var(--a)",borderRadius:2,transition:"width .4s"}}/>
        </div>
        <div style={{fontSize:11,color:"var(--m)",fontFamily:"var(--mono)",flexShrink:0}}>
          {doneTasks}/{totalTasks} done
        </div>
      </div>

      {/* Time-sorted tasks */}
      <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",
        color:"var(--m)",marginBottom:8}}>Today's Schedule</div>

      {tasks.map(task => {
        const cfg = MODULE_CONFIG[task.module] || MODULE_CONFIG.fitness;
        const isExpanded = expandedTask === task.id;
        return (
          <div key={task.id} style={{marginBottom:7}}>
            {/* Task row */}
            <div className={"ti"+(task.done?" done":"")}
              onClick={task.done ? ()=>setExpandedTask(t=>t===task.id?null:task.id) : task.onTap}
              style={{borderColor:isExpanded?"var(--b2)":"var(--b)"}}>
              <div className="tic" style={{background:cfg.bg,fontSize:18}}>{task.icon}</div>
              <div className="tinfo">
                <div className="tlbl">{task.label}</div>
                <div className="tdsc">
                  {task.day?.time_window && (
                    <span style={{color:cfg.color,fontWeight:700,marginRight:5,fontFamily:"var(--mono)",fontSize:10}}>
                      {task.day.time_window}
                    </span>
                  )}
                  {task.id==="sleep" ? task.desc : (task.day?.time_window ? cfg.label : task.desc)}
                </div>
              </div>
              {task.done
                ? <span className="tbdg d" style={{background:cfg.bg,color:cfg.color}}>Done ✓</span>
                : <span className="tbdg p">Tap</span>}
              {task.done && <span style={{color:"var(--m)",fontSize:12,marginLeft:4}}>↩</span>}
              {!task.done && task.id!=="sleep" && <span style={{color:cfg.color,fontSize:15,marginLeft:4}}>›</span>}
            </div>

            {/* Expanded session detail — shows focus + check-in question */}
            {isExpanded && !task.done && task.day && (
              <div style={{background:cfg.bg,border:"1px solid "+cfg.border,borderRadius:"0 0 10px 10px",
                padding:"12px 14px",marginTop:-4,borderTop:"none",animation:"fadeup .2s ease"}}>
                {task.sessionFocus && (
                  <div style={{fontSize:12,color:"var(--m2)",lineHeight:1.65,marginBottom:8}}>
                    {task.sessionFocus}
                  </div>
                )}
                {task.day?.check_in_question && (
                  <div style={{fontSize:11,color:cfg.color,fontWeight:600,
                    background:"var(--bg2)",borderRadius:7,padding:"7px 10px",
                    marginBottom:10,borderLeft:"2px solid "+cfg.border,lineHeight:1.6}}>
                    ✦ {task.day.check_in_question}
                  </div>
                )}
                <button className="btn bp" style={{width:"100%",
                  background:"linear-gradient(135deg,"+cfg.color+","+cfg.color+"BB)"}}
                  onClick={()=>setCompletingTask(task)}>
                  ✅ Mark Complete
                </button>
              </div>
            )}
          </div>
        );
      })}

      {dayData?.combined_analysis && <AiBox label="Day Observation" text={dayData.combined_analysis}/>}

      {/* This Week — mini blueprint for all 3 modules */}
      {["fitness","skills","hobbies"].some(m => weekPlan?.[m]?.days?.length > 0) && (
        <div style={{marginTop:18}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",
            color:"var(--m)",marginBottom:10}}>This Week</div>
          {["fitness","skills","hobbies"].map(mod => {
            const plan = weekPlan?.[mod];
            if (!plan?.days?.length) return null;
            const cfg = MODULE_CONFIG[mod];
            return (
              <div key={mod} style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:cfg.color,
                  letterSpacing:"0.5px",marginBottom:6,display:"flex",
                  alignItems:"center",gap:6}}>
                  {cfg.icon} {cfg.label}
                </div>
                <WeekScheduleViewById weekStart={ws} currentWeekStart={ws}
                  module={mod}
                  onComplete={(day)=>{
                    setExpandedTask(null);
                    setCompletingTask({day, module:mod, label:day.session_name, desc:day.time_window});
                  }}/>
              </div>
            );
          })}
        </div>
      )}

      {uploadOpen && <DailyUploadModal today={today}
        todayPlan={weekPlan?.fitness?.days?.find(d=>d.day?.slice(0,3)===todayDayAbbr)}
        onClose={()=>{setUploadOpen(false);load();}}
        onDone={onAnalysisDone}/>}

      {completingTask && (
        <DayDetailModal
          day={completingTask.day}
          weekStartDate={ws}
          onClose={()=>setCompletingTask(null)}
          onCompleted={()=>{ setCompletingTask(null); load(); }}
        />
      )}
    </div>
  );
}

function HomeTab({ streak, weekPlan }) { return <TodayTab streak={streak} weekPlan={weekPlan}/>; }

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY UPLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DailyUploadModal({ today, todayPlan, onClose, onDone }) {
  const [sf, setSf]=useState(null); const [sp,setSp]=useState(null);
  const [af, setAf]=useState(null); const [ap,setAp]=useState(null);
  const [loading, setLoading]=useState(false);
  const [result, setResult]=useState(null);
  const [err, setErr]=useState(null);

  const analyze = async () => {
    if (!sf||!af){setErr("Upload both screenshots first.");return;}
    setLoading(true);setErr(null);
    try {
      const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({data:r.result.split(",")[1],type:f.type});r.onerror=rej;r.readAsDataURL(f);});
      const [s,a]=await Promise.all([toB64(sf),toB64(af)]);
      const res=await api("/analyze/day",{method:"POST",body:JSON.stringify({
        date:today,sleep_image:s,activity_image:a,
        yesterday_schedule:todayPlan?JSON.stringify(todayPlan):"No schedule yet"
      })});
      setResult(res.analysis);
      if (onDone) onDone(res); // immediately update parent with score
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Sleep + Activity</div>
          <div className="ms">Both analyzed together with context</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.6}}>
            Upload both screenshots. AI analyzes them simultaneously and writes a permanent day observation stored in your database.
          </div>
          <div className="upload-pair">
            <UploadZone label="Sleep" file={sf} setFile={setSf} preview={sp} setPreview={setSp}/>
            <UploadZone label="Activity" file={af} setFile={setAf} preview={ap} setPreview={setAp}/>
          </div>
          <Err msg={err}/>
          {result&&<AiBox label="Day Observation — saved to database" text={result}/>}
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={analyze} disabled={!sf||!af||loading}>
            {loading?<><Dots/> Analyzing…</>:"✦ Analyze Together"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAY DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DayDetailModal({ day, weekStartDate, onClose, onCompleted }) {
  const module = day.module || "fitness";
  const cfg = MODULE_CONFIG[module] || MODULE_CONFIG.fitness;
  const dateLabel = day.date_label || (weekStartDate ? dayDateLabel(weekStartDate, day.day) : day.day);
  const actualDate = weekStartDate ? dayDate(weekStartDate, day.day).toISOString().slice(0,10) : todayStr();
  const isToday = actualDate === todayStr();
  const isPast  = actualDate < todayStr();

  const [answer, setAnswer]         = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted]   = useState(false);
  const [observation, setObservation] = useState(null);
  const [err, setErr]               = useState(null);

  useEffect(()=>{
    // Check if already completed today
    api(`/data/day/${actualDate}`).then(d=>{
      if (module === "fitness" && d.workout_completed) setCompleted(true);
    }).catch(()=>{});
  },[actualDate, module]);

  // Parse fitness workout into WARM UP / MAIN WORK / COOL DOWN sections
  const parseWorkout = text => {
    if(!text) return [];
    const sections=[]; let cur=null;
    text.split("\n").map(l=>l.trim()).filter(Boolean).forEach(l=>{
      if(l.match(/^(WARM.?UP|MAIN WORK|COOL.?DOWN)/i)){
        cur={title:l.replace(/:$/,""),items:[]};sections.push(cur);
      } else if(l.startsWith("-")&&cur) cur.items.push(l.slice(1).trim());
      else if(cur&&l) cur.items.push(l);
    });
    return sections;
  };

  const isFitness = module === "fitness";
  const sections = isFitness ? parseWorkout(day.session_detail||"") : [];
  const sessionFocus = !isFitness ? (day.session_detail || "") : "";
  const question = day.check_in_question || "";

  const handleComplete = async () => {
    setCompleting(true); setErr(null);
    try {
      const res = await api("/module/session/complete", {
        method:"POST",
        body: JSON.stringify({
          module,
          session_name: day.session_name,
          date: actualDate,
          check_in_question: question || null,
          answer: answer.trim() || null,
          session_detail: day.session_detail || "",
        })
      });
      setObservation(res.observation);
      setCompleted(true);
      if (onCompleted) onCompleted();
    } catch(e) { setErr(e.message); }
    setCompleting(false);
  };

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mh">
          <div>
            <div className="mt">{day.session_name || cfg.label + " Session"}</div>
            <div className="ms" style={{color:cfg.color}}>
              {dateLabel}{day.time_window?" · "+day.time_window:""}{isToday?" · Today":""}{completed?" · ✓ Done":""}
            </div>
          </div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">

          {/* AI scheduling note */}
          {day.ai_note && (
            <div style={{fontSize:12,color:"var(--m2)",background:"var(--bg3)",borderRadius:9,
              padding:"9px 12px",marginBottom:13,borderLeft:"2px solid "+cfg.border,lineHeight:1.65}}>
              {day.ai_note}
            </div>
          )}

          {/* FITNESS: show WARM UP / MAIN WORK / COOL DOWN */}
          {isFitness && sections.length > 0 && sections.map((sec,i) => (
            <div key={i} className="ex-section">
              <div className="ex-section-title">{sec.title}</div>
              {sec.items.map((item,j) => {
                const sets = item.match(/(\d+)\s*x\s*(\d+)/);
                const parts = item.split("—");
                return (
                  <div key={j} className="exr">
                    <span className="exn">{parts[0].trim()}</span>
                    {sets && <span className="exrp">{sets[0]}</span>}
                    {parts[1] && <span className="exnote">{parts[1].trim()}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {isFitness && sections.length === 0 && !day.is_rest && (
            <div className="empty-state">No workout details yet — re-upload your schedule to regenerate.</div>
          )}

          {/* SKILLS / HOBBIES: show session focus */}
          {!isFitness && sessionFocus && (
            <div style={{background:cfg.bg,border:"1px solid "+cfg.border,borderRadius:10,
              padding:"12px 14px",marginBottom:13}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                color:cfg.color,marginBottom:6}}>This Session</div>
              <div style={{fontSize:13,lineHeight:1.7,color:"var(--t)",whiteSpace:"pre-wrap"}}>{sessionFocus}</div>
            </div>
          )}
          {!isFitness && !sessionFocus && (
            <div className="empty-state">No session details — re-upload your schedule after adding notes.</div>
          )}

          {/* CHECK-IN QUESTION — shown for all modules if not yet completed */}
          {!completed && (isToday || isPast) && question && (
            <div style={{marginTop:14}}>
              <div style={{fontSize:11,fontWeight:700,color:cfg.color,letterSpacing:"1px",
                textTransform:"uppercase",marginBottom:6}}>Check-In</div>
              <div style={{fontSize:13,color:"var(--t)",fontWeight:500,marginBottom:8,lineHeight:1.6}}>
                {question}
              </div>
              <input className="inp" placeholder="Your answer…"
                value={answer} onChange={e=>setAnswer(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleComplete()}/>
            </div>
          )}

          {/* Future session */}
          {!completed && !isToday && !isPast && (
            <div className="empty-state">Future session — come back on {dateLabel.split(",")[0]}.</div>
          )}

          {/* AI observation after completion */}
          {observation && <AiBox label="Session Insight — saved" text={observation}/>}

          <Err msg={err}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          {!completed && (isToday || isPast) && (
            <button className="btn bp" style={{background:cfg.color==="var(--a)"?"linear-gradient(135deg,var(--a),#3DDFAA)":cfg.color}}
              onClick={handleComplete} disabled={completing}>
              {completing ? <><Dots/> Saving…</> : "✅ Mark Complete"}
            </button>
          )}
          {completed && (
            <div style={{flex:1,textAlign:"center",color:cfg.color,fontSize:13,fontWeight:700,padding:"10px 0"}}>
              ✓ Session Logged
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Fetches and displays a specific week's plan by week_start date
function WeekScheduleViewById({ weekStart: ws, currentWeekStart, module="fitness", onComplete }) {
  const [plan, setPlan]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const cfg = MODULE_CONFIG[module] || MODULE_CONFIG.fitness;

  useEffect(()=>{
    setLoading(true);
    api("/data/week/" + ws)
      .then(p=>{ setPlan(p); setLoading(false); })
      .catch(()=>{ setPlan(null); setLoading(false); });
  },[ws]);

  if (loading) return <div style={{textAlign:"center",padding:"20px"}}><Dots/></div>;

  const days = (plan?.[module]?.days) || [];
  const ctxCls = c=>c?.includes("Work")&&c?.includes("College")?"cb":c==="Work"?"cw":c==="College"?"cc":c==="Off"?"co":"cr";
  const isCurrent = ws === currentWeekStart;

  if (days.length === 0) return (
    <div className="empty-state">No {module} plan for this week.</div>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700}}>
          {plan?.[module]?.week_number ? "Week " + plan[module].week_number : "Week"}
        </div>
        {isCurrent && <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,
          background:cfg.bg,color:cfg.color}}>CURRENT</span>}
        <div style={{fontSize:10,color:"var(--m)",fontFamily:"var(--mono)",marginLeft:"auto"}}>
          {weekRangeLabel(ws)}
        </div>
      </div>
      {days.map((day,i)=>{
        const isToday = isCurrent && isTodayDay(ws, day.day);
        const dateLabel = day.date_label || dayDateLabel(ws, day.day);
        const shortDate = dateLabel.replace(/\w+,\s*/, "");
        return (
          <div key={i} className={"bpr"+(day.is_rest?" rest":"")+(isToday?" today":"")}
            onClick={()=>{ if(!day.is_rest){ if(onComplete) onComplete(day); else setSelectedDay(day); } }}>
            {isToday&&<div className="tdot" style={{background:cfg.color}}/>}
            <div className="bp-date-col">
              <div className="bpday">{day.day}</div>
              <div className="bpdate">{shortDate}</div>
            </div>
            <div className={"bpctx "+ctxCls(day.context)}>{day.context||"—"}</div>
            <div className="bptyp">{day.session_name||(day.is_rest?"Rest Day":"—")}</div>
            <div className="bpwin">{day.time_window}</div>
            {!day.is_rest&&<span style={{color:cfg.color,fontSize:15,marginLeft:2}}>›</span>}
          </div>
        );
      })}
      {selectedDay && (
        <DayDetailModal day={selectedDay} weekStartDate={ws}
          onClose={()=>setSelectedDay(null)}/>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FITNESS TAB — uses shared ModuleTab
// ═══════════════════════════════════════════════════════════════════════════════
function FitnessTab() { return <ModuleTab module="fitness"/>; }

// ─── Body Comp ────────────────────────────────────────────────────────────────
function BodyCompModal({ weekStartDate, onClose, onDone }) {
  const [file,setFile]=useState(null);const [prev,setPrev]=useState(null);
  const [loading,setLoading]=useState(false);const [err,setErr]=useState(null);
  const ref=useRef();

  const analyze = async () => {
    if(!file){setErr("Upload screenshot.");return;}
    setLoading(true);setErr(null);
    try {
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({data:r.result.split(",")[1],type:file.type});r.onerror=rej;r.readAsDataURL(file);});
      const res=await api("/analyze/body-comp",{method:"POST",body:JSON.stringify({week_start:weekStartDate,image:b64})});
      onDone(res.analysis);
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Body Composition</div>
          <div className="ms">Samsung Health screenshot</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          {prev?<img src={prev} className="upr" alt="comp"/>:
            <div className="uz" onClick={()=>ref.current?.click()}>
              <div style={{fontSize:22,marginBottom:5}}>📐</div>
              <div style={{fontSize:12,color:"var(--m2)"}}><b style={{color:"var(--t)"}}>Tap to upload</b></div>
            </div>}
          <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
            onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPrev(URL.createObjectURL(f));}}}/>
          <Err msg={err}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={analyze} disabled={!file||loading}>
            {loading?<><Dots/> Analyzing…</>:"✦ Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════════
function GoalsSection() {
  const [goals,setGoals]=useState([]);const [input,setInput]=useState("");
  const [adding,setAdding]=useState(false);const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api("/goals?module=fitness").then(d=>{setGoals(d.goals||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  const addGoal = async () => {
    if(!input.trim())return;setAdding(true);
    const opt={id:Date.now(),text:input.trim(),ai_insight:null,done:false,created_at:new Date().toISOString()};
    setGoals(g=>[opt,...g]);setInput("");
    try {
      const res=await api("/goals",{method:"POST",body:JSON.stringify({text:opt.text,module:"fitness"})});
      setGoals(g=>g.map(x=>x.id===opt.id?{...x,id:res.id,ai_insight:res.ai_insight}:x));
    }catch{setGoals(g=>g.map(x=>x.id===opt.id?{...x,ai_insight:"Could not analyze — check Worker."}:x));}
    setAdding(false);
  };

  const toggleDone=async(id,done)=>{setGoals(g=>g.map(x=>x.id===id?{...x,done:!done}:x));await api(`/goals/${id}`,{method:"PATCH",body:JSON.stringify({done:!done})}).catch(()=>{});};
  const deleteGoal=async id=>{setGoals(g=>g.filter(x=>x.id!==id));await api(`/goals/${id}`,{method:"DELETE"}).catch(()=>{});};

  if(loading)return<div style={{textAlign:"center",padding:"30px",color:"var(--m)"}}><Dots/></div>;

  return (
    <div>
      <div style={{marginBottom:13}}>
        <div style={{fontSize:13,fontWeight:700}}>Fitness Goals</div>
        <div style={{fontSize:10,color:"var(--m)",marginTop:2}}>Goals feed into your workout plan each week</div>
      </div>
      <div className="goal-input-wrap">
        <input className="goal-input" placeholder="e.g. Do 15 pull-ups · Lose 5kg body fat · Run 5km"
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&addGoal()} disabled={adding}/>
        <button className="btn bp bsm" onClick={addGoal} disabled={adding||!input.trim()}>
          {adding?<Dots/>:"Add"}
        </button>
      </div>
      {goals.length===0&&<div className="empty-state">No goals yet. Add your first one above.</div>}
      {goals.map(g=>(
        <div key={g.id} className={"goal-card"+(g.done?" done":"")}
          style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 13px"}}>
          {/* Checkbox */}
          <div onClick={()=>toggleDone(g.id,g.done)}
            style={{width:20,height:20,borderRadius:5,border:"2px solid var(--b2)",
              background:g.done?"var(--a)":"transparent",flexShrink:0,marginTop:2,
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all .15s"}}>
            {g.done && <span style={{color:"var(--bg)",fontSize:12,fontWeight:900}}>✓</span>}
          </div>
          {/* Content */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,
              textDecoration:g.done?"line-through":"none",
              color:g.done?"var(--m)":"var(--t)",lineHeight:1.4,marginBottom:4}}>
              {g.text}
            </div>
            {g.ai_insight===null
              ? <div style={{fontSize:11,color:"var(--m)",display:"flex",alignItems:"center",gap:5}}>
                  <Dots/> Adding to workout plan…
                </div>
              : g.ai_insight && (
                  <div style={{fontSize:12,color:"var(--a)",lineHeight:1.55,
                    background:"rgba(92,255,176,0.06)",borderRadius:7,
                    padding:"6px 9px",borderLeft:"2px solid var(--a)"}}>
                    {stripStars(g.ai_insight)}
                  </div>
                )
            }
          </div>
          {/* Delete */}
          <button className="gc-btn" onClick={()=>deleteGoal(g.id)}
            style={{flexShrink:0,marginTop:1}}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES TAB
// Input at top, no placeholder. Raw notes hidden after processing.
// Only AI-processed results shown below.
// ═══════════════════════════════════════════════════════════════════════════════
function NotesTab() {
  const [notes, setNotes]         = useState([]);
  const [contexts, setContexts]   = useState({}); // {module: context_string}
  const [input, setInput]         = useState("");
  const [editId, setEditId]       = useState(null);
  const [editText, setEditText]   = useState("");
  const [adding, setAdding]       = useState(false);
  const [processingId, setProcessingId] = useState(null); // which note is being processed
  const [processingAll, setProcessingAll] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [filterMod, setFilterMod] = useState("all");

  const MODULE_COLORS = {
    fitness:  {bg:"var(--fitness-bg)",  border:"var(--fitness-border)",  color:"var(--fitness-color)"},
    hobbies:  {bg:"var(--hobbies-bg)",  border:"var(--hobbies-border)",  color:"var(--hobbies-color)"},
    skills:   {bg:"var(--skills-bg)",   border:"var(--skills-border)",   color:"var(--skills-color)"},
    general:  {bg:"var(--bg3)",         border:"var(--b2)",              color:"var(--m)"},
  };

  const load = async () => {
    try {
      const [n, c] = await Promise.all([
        api("/notes").catch(()=>({notes:[]})),
        api("/notes/context").catch(()=>({contexts:[]})),
      ]);
      setNotes(n.notes || []);
      // Build contexts map by module
      const ctxMap = {};
      (c.contexts || []).forEach(cx => { ctxMap[cx.module] = cx.context; });
      setContexts(ctxMap);
    } catch {}
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const addNote = async () => {
    if (!input.trim()) return;
    setAdding(true);
    try {
      const res = await api("/notes", {method:"POST", body:JSON.stringify({content:input.trim()})});
      const newNote = res.note || {id:Date.now(), content:input.trim(), created_at:new Date().toISOString(), processed:0, module:"general", context:null};
      setNotes(prev => [newNote, ...prev]);
      setInput("");
    } catch(e) { alert("Failed to save: " + e.message); }
    setAdding(false);
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await api(`/notes/${editId}`, {method:"PATCH", body:JSON.stringify({content:editText.trim()})});
      setNotes(prev => prev.map(n => n.id===editId ? {...n, content:editText.trim(), processed:0, module:"general", context:null} : n));
      setEditId(null); setEditText("");
    } catch(e) { alert(e.message); }
  };

  const deleteNote = async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await api(`/notes/${id}`, {method:"DELETE"}).catch(()=>{});
  };

  const processOne = async (note) => {
    setProcessingId(note.id);
    try {
      const res = await api("/notes/process", {method:"POST", body:JSON.stringify({note_id:note.id})});
      if (res.notes?.length) {
        const updated = { ...res.notes[0] };
        setNotes(prev => prev.map(n => n.id===note.id ? {...n, module:updated.module, category:updated.category, context:updated.context, processed:1} : n));
      }
      if (res.contexts?.length) {
        setContexts(prev => {
          const next = {...prev};
          res.contexts.forEach(cx => { next[cx.module] = cx.context; });
          return next;
        });
      }
    } catch(e) { alert(e.message); }
    setProcessingId(null);
  };

  const processAll = async () => {
    const unprocessed = notes.filter(n => !n.processed);
    if (!unprocessed.length) return;
    setProcessingAll(true);
    try {
      const res = await api("/notes/process", {method:"POST"});
      if (res.notes?.length) {
        const updMap = {};
        res.notes.forEach(u => { updMap[u.id] = u; });
        setNotes(prev => prev.map(n => updMap[n.id] ? {...n, ...updMap[n.id], processed:1} : n));
      }
      if (res.contexts?.length) {
        const ctxMap = {...contexts};
        res.contexts.forEach(cx => { ctxMap[cx.module] = cx.context; });
        setContexts(ctxMap);
      }
    } catch(e) { alert(e.message); }
    setProcessingAll(false);
  };

  if (loading) return <div className="cnt" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}><Dots/></div>;

  const unprocessedCount = notes.filter(n => !n.processed).length;

  return (
    <div className="cnt">
      <div style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700}}>Notes</div>
        <div style={{fontSize:10,color:"var(--m)",marginTop:2,lineHeight:1.55}}>
          Write anything. AI categorizes into: General Info · Fitness Goal · Skill Goal · Hobby Goal — and feeds each to the right planner when you upload your schedule.
        </div>
      </div>

      {/* Input */}
      <textarea className="ta" value={input} onChange={e=>setInput(e.target.value)}
        style={{minHeight:72,marginBottom:8}}/>
      <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
        <button className="btn bp bsm" onClick={addNote} disabled={adding||!input.trim()}>
          {adding?<Dots/>:"Add Note"}
        </button>
        <button className="btn bs" onClick={processAll}
          disabled={processingAll||notes.every(n=>n.processed)} style={{flex:"1 1 160px"}}>
          {processingAll
            ? <><Dots/> Processing…</>
            : unprocessedCount > 0
              ? `✦ Process ${unprocessedCount} note${unprocessedCount>1?"s":""}`
              : "✦ Process All Notes"}
        </button>
      </div>

      {/* AI contexts by module */}
      {Object.keys(contexts).length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",
            color:"var(--m)",marginBottom:8}}>Active AI context per module</div>
          {Object.entries(contexts).map(([mod, ctx]) => {
            const c = MODULE_COLORS[mod] || MODULE_COLORS.general;
            return (
              <div key={mod} style={{background:c.bg,border:"1px solid "+c.border,
                borderRadius:9,padding:"9px 12px",marginBottom:7}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"1.5px",
                  textTransform:"uppercase",color:c.color,marginBottom:5}}>
                  ✦ {mod}
                </div>
                <div style={{fontSize:12,color:"var(--m2)",lineHeight:1.65}}>{ctx}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      {notes.length > 0 && (
        <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
          {[
            {id:"all",    label:"All",          color:"var(--m)"},
            {id:"fitness",label:"Fitness Goal",  color:"var(--fitness-color)"},
            {id:"skills", label:"Skill Goal",    color:"var(--skills-color)"},
            {id:"hobbies",label:"Hobby Goal",    color:"var(--hobbies-color)"},
            {id:"general",label:"General Info",  color:"var(--m)"},
          ].map(f => {
            const active = filterMod === f.id;
            const count = f.id === "all" ? notes.length : notes.filter(n => n.module === f.id).length;
            if (f.id !== "all" && count === 0) return null;
            return (
              <button key={f.id} onClick={()=>setFilterMod(f.id)}
                style={{padding:"4px 10px",borderRadius:20,border:"1px solid",fontSize:10,
                  fontWeight:700,cursor:"pointer",letterSpacing:"0.3px",transition:"all .12s",
                  background: active ? f.color : "var(--bg2)",
                  borderColor: active ? f.color : "var(--b)",
                  color: active ? (f.id==="all"?"var(--t)":"var(--bg2)") : f.color}}>
                {f.label} {count > 0 && <span style={{opacity:0.75}}>({count})</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* All notes — filtered */}
      {notes.length > 0 ? (
        <div>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",
            color:"var(--m)",marginBottom:8,display:"flex",justifyContent:"space-between"}}>
            <span>
              {filterMod==="all"
                ? `${notes.length} note${notes.length>1?"s":""}`
                : notes.filter(n=>n.module===filterMod).length + " note" + (notes.filter(n=>n.module===filterMod).length!==1?"s":"")}
            </span>
            <span style={{fontWeight:400}}>Tap ✏ to edit</span>
          </div>
          {notes.filter(n => filterMod==="all" || n.module===filterMod).map(n => {
            const c = MODULE_COLORS[n.module || "general"] || MODULE_COLORS.general;
            const isEditing = editId === n.id;
            return (
              <div key={n.id} className="note-card" style={{marginBottom:8}}>
                {/* Header row */}
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                  {n.processed ? (
                    <span style={{fontSize:8,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",
                      padding:"2px 7px",borderRadius:4,background:c.bg,
                      border:"1px solid "+c.border,color:c.color}}>
                      {n.category || n.module || "general info"}
                    </span>
                  ) : (
                    <span style={{fontSize:8,color:"var(--warn)",fontWeight:700,letterSpacing:"1px",
                      textTransform:"uppercase",padding:"2px 7px",borderRadius:4,
                      background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)"}}>
                      unprocessed
                    </span>
                  )}
                  <span style={{fontSize:9,color:"var(--m)",fontFamily:"var(--mono)",marginLeft:"auto"}}>
                    {new Date(n.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                  </span>
                  <button className="gc-btn" style={{fontSize:12}}
                    onClick={()=>{ setEditId(n.id); setEditText(n.content); }}>✏</button>
                  <button className="gc-btn" onClick={()=>deleteNote(n.id)}>✕</button>
                </div>

                {/* Show refined note if processed, raw content if editing or unprocessed */}
                {isEditing ? (
                  <div>
                    <textarea className="ta" value={editText} onChange={e=>setEditText(e.target.value)}
                      style={{minHeight:60,marginBottom:7,fontSize:13}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn bs bsm" onClick={()=>{setEditId(null);setEditText("");}}>Cancel</button>
                      <button className="btn bp bsm" onClick={saveEdit}>Save</button>
                    </div>
                  </div>
                ) : n.processed && n.context ? (
                  <div style={{fontSize:13,lineHeight:1.65,color:"var(--t)",whiteSpace:"pre-wrap"}}>
                    {n.context}
                  </div>
                ) : (
                  <div style={{fontSize:13,lineHeight:1.65,color:"var(--t)",whiteSpace:"pre-wrap"}}>
                    {n.content}
                  </div>
                )}

                {/* Process button if unprocessed */}
                {!n.processed && !isEditing && (
                  <button className="btn bs bsm" style={{marginTop:7,width:"100%"}}
                    onClick={()=>processOne(n)} disabled={processingId===n.id}>
                    {processingId===n.id ? <><Dots/> Categorizing…</> : "✦ Process this note"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div style={{fontSize:26,marginBottom:7}}>📝</div>
          {filterMod==="all"
            ? "No notes yet. Add your first note above."
            : `No ${filterMod} notes yet. Add a note and process it.`}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// Schedule upload, app settings, danger zone
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsTab({ onReset, lightMode, toggleLight }) {
  const [schedOpen, setSchedOpen]     = useState(false);
  const [resetOpen, setResetOpen]     = useState(false);
  const [compOpen, setCompOpen]       = useState(false);
  const [compResult, setCompResult]   = useState(null);
  const [weekViewMod, setWeekViewMod] = useState(null); // which module's week view is open
  const [bodyweightOnly, setBodyweightOnly] = useState(
    localStorage.getItem("lifeos_bodyweight") !== "false"
  );
  const [unitSystem, setUnitSystem]   = useState(
    localStorage.getItem("lifeos_units") || "metric"
  );
  const [sessionTimeout, setSessionTimeout] = useState(
    localStorage.getItem("lifeos_timeout") || "5"
  );
  const [notifEnabled, setNotifEnabled] = useState(
    localStorage.getItem("lifeos_notif") === "true"
  );

  const ws = weekStart(todayStr());

  const toggle = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, val.toString());
  };

  return (
    <div className="cnt">

      {/* Schedule Upload */}
      <div className="settings-section">
        <div className="settings-title">Schedule</div>
        <div className="setting-row" style={{cursor:"pointer"}} onClick={()=>setSchedOpen(true)}>
          <div className="sr-left">
            <div className="sr-label">📅 Upload Weekly Schedule</div>
            <div className="sr-desc">AI reads your schedule and generates this week's workout plan</div>
          </div>
          <span style={{color:"var(--a)",fontSize:15}}>›</span>
        </div>
      </div>

      {/* Workout Preferences */}
      <div className="settings-section">
        <div className="settings-title">Workout Preferences</div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Bodyweight Only</div>
            <div className="sr-desc">No equipment — only exercises using your body weight</div>
          </div>
          <div className={"toggle"+(bodyweightOnly?" on":"")}
            onClick={()=>toggle("lifeos_bodyweight",!bodyweightOnly,setBodyweightOnly)}>
            <div className="toggle-thumb"/>
          </div>
        </div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Unit System</div>
            <div className="sr-desc">Used in body comp analysis and reports</div>
          </div>
          <select className="sel" style={{width:100}} value={unitSystem}
            onChange={e=>{setUnitSystem(e.target.value);localStorage.setItem("lifeos_units",e.target.value);}}>
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Workout Days per Week</div>
            <div className="sr-desc">Target sessions AI schedules per week</div>
          </div>
          <select className="sel" style={{width:80}}
            defaultValue={localStorage.getItem("lifeos_days")||"4"}
            onChange={e=>localStorage.setItem("lifeos_days",e.target.value)}>
            {[3,4,5,6].map(n=><option key={n} value={n}>{n} days</option>)}
          </select>
        </div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Preferred Workout Duration</div>
            <div className="sr-desc">AI targets this window when scheduling</div>
          </div>
          <select className="sel" style={{width:100}}
            defaultValue={localStorage.getItem("lifeos_duration")||"45"}
            onChange={e=>localStorage.setItem("lifeos_duration",e.target.value)}>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="75">75 min</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Week Starts On</div>
            <div className="sr-desc">Used in schedule view, blueprint, and week calculations</div>
          </div>
          <select className="sel" style={{width:110}}
            defaultValue={localStorage.getItem("lifeos_week_start_day")||"0"}
            onChange={e=>{
              localStorage.setItem("lifeos_week_start_day", e.target.value);
              window.location.reload();
            }}>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">My Free Day</div>
            <div className="sr-desc">Reminders to upload next week's schedule and body comp appear on this day</div>
          </div>
          <select className="sel" style={{width:110}}
            defaultValue={localStorage.getItem("lifeos_free_day")||"0"}
            onChange={e=>localStorage.setItem("lifeos_free_day", e.target.value)}>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </div>
      </div>

      {/* Tracking */}
      <div className="settings-section">
        <div className="settings-title">Tracking</div>

        {/* Body Comp upload */}
        <div className="setting-row" style={{cursor:"pointer"}} onClick={()=>setCompOpen(true)}>
          <div className="sr-left">
            <div className="sr-label">📐 Upload Body Composition</div>
            <div className="sr-desc">Samsung Health screenshot — AI tracks your metrics week over week</div>
          </div>
          <span style={{color:"var(--a)",fontSize:15}}>›</span>
        </div>

        {compResult && (
          <div style={{margin:"8px 0 4px"}}>
            <AiBox label="Body Composition Analysis" text={compResult}/>
          </div>
        )}

        {/* Week schedule views per module */}
        {["fitness","skills","hobbies"].map(mod => {
          const cfg = MODULE_CONFIG[mod];
          return (
            <div key={mod} className="setting-row" style={{cursor:"pointer"}}
              onClick={()=>setWeekViewMod(weekViewMod===mod ? null : mod)}>
              <div className="sr-left">
                <div className="sr-label">{cfg.icon} {cfg.label} — This Week</div>
                <div className="sr-desc">View blueprint, complete sessions, generate weekly review</div>
              </div>
              <span style={{color:cfg.color,fontSize:15,transition:"transform .2s",
                display:"inline-block",transform:weekViewMod===mod?"rotate(90deg)":"none"}}>›</span>
            </div>
          );
        })}
      </div>

      {/* Expanded module week view */}
      {weekViewMod && (
        <div style={{marginBottom:16}}>
          <ModuleTab module={weekViewMod}/>
        </div>
      )}

      {/* App Settings */}
      <div className="settings-section">
        <div className="settings-title">App Settings</div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Auto-Lock Timeout</div>
            <div className="sr-desc">Lock app after this many minutes of inactivity</div>
          </div>
          <select className="sel" style={{width:90}} value={sessionTimeout}
            onChange={e=>{setSessionTimeout(e.target.value);localStorage.setItem("lifeos_timeout",e.target.value);}}>
            <option value="3">3 min</option>
            <option value="5">5 min</option>
            <option value="10">10 min</option>
            <option value="30">30 min</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">{lightMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</div>
            <div className="sr-desc">{lightMode ? "Switch to dark — easier on eyes at night" : "Switch to light — better in bright environments"}</div>
          </div>
          <div className={"toggle"+(lightMode?"":" on")} onClick={toggleLight}>
            <div className="toggle-thumb"/>
          </div>
        </div>

        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Workout Reminders</div>
            <div className="sr-desc">Browser notification at your scheduled workout time</div>
          </div>
          <div className={"toggle"+(notifEnabled?" on":"")}
            onClick={()=>toggle("lifeos_notif",!notifEnabled,setNotifEnabled)}>
            <div className="toggle-thumb"/>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-title">About</div>
        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">LifeOS</div>
            <div className="sr-desc">Personal life dashboard · Powered by Gemini AI · Built on Cloudflare</div>
          </div>
          <div style={{fontSize:10,color:"var(--m)",fontFamily:"var(--mono)"}}>v1.0</div>
        </div>
        <div className="setting-row">
          <div className="sr-left">
            <div className="sr-label">Worker Status</div>
            <div className="sr-desc">{WORKER_URL}</div>
          </div>
          <div style={{fontSize:10,color:"var(--a)",fontFamily:"var(--mono)"}}>Connected</div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section">
        <div className="settings-title">Danger Zone</div>
        <div className="danger-zone">
          <div className="danger-title">⚠ Irreversible Actions</div>
          <div style={{fontSize:12,color:"var(--m2)",lineHeight:1.65,marginBottom:12}}>
            The button below deletes every piece of data stored in your database —
            all day observations, workout history, body comp, goals, notes, and streaks.
            The app will return to a completely fresh state. This cannot be undone.
          </div>
          <button className="btn bwarn" onClick={()=>setResetOpen(true)}
            style={{width:"100%"}}>
            🗑 Delete All Data & Reset App
          </button>
        </div>
      </div>

      {schedOpen&&(
        <ScheduleUploadModal weekStartDate={ws} onClose={()=>setSchedOpen(false)}/>
      )}
      {compOpen&&(
        <BodyCompModal weekStartDate={ws} onClose={()=>setCompOpen(false)}
          onDone={r=>{setCompResult(r);setCompOpen(false);}}/>
      )}
      {resetOpen&&(
        <ResetModal onClose={()=>setResetOpen(false)} onReset={()=>{ setResetOpen(false); onReset(); }}/>
      )}
    </div>
  );
}

// ─── Schedule Upload Modal ────────────────────────────────────────────────────
// Auto-detect which week a schedule upload is for.
// Logic: if today is Thu/Fri/Sat/Sun → almost certainly planning next week
//        if today is Mon/Tue/Wed → could be this week still
// Always computes the correct Monday-based week start.
function autoDetectWeekStart() {
  // Returns this week or next week's start date based on user's preferred start day.
  // If today is within the last 3 days of the current week → probably planning next week
  const today = new Date();
  const startDay = getWeekStartDay();
  const dow = today.getDay();
  // Days until next start day
  const daysUntilNext = (startDay - dow + 7) % 7 || 7;
  // If we are 0-2 days into the current week, plan this week; otherwise plan next week
  const daysIntoWeek = (dow - startDay + 7) % 7;
  const planNext = daysIntoWeek >= 4; // Thu or later in the current week = plan next
  const target = new Date(today);
  if (planNext) target.setDate(today.getDate() + daysUntilNext);
  else target.setDate(today.getDate() - daysIntoWeek);
  const y = target.getFullYear();
  const m = String(target.getMonth()+1).padStart(2,"0");
  const d = String(target.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function weekRangeLabel(ws) {
  const d = new Date(ws + "T12:00:00");
  const end = new Date(ws + "T12:00:00");
  end.setDate(end.getDate() + 6);
  const opts = { month:"short", day:"numeric" };
  return d.toLocaleDateString("en-US", opts) + " – " + end.toLocaleDateString("en-US", opts);
}

function ScheduleUploadModal({ weekStartDate, onClose }) {
  const targetWeek = autoDetectWeekStart();
  const [mode, setMode]         = useState("text");
  const [schedText, setSchedText] = useState("");
  const [file, setFile]         = useState(null);
  const [prev, setPrev]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [duplicate, setDuplicate] = useState(null); // set when same schedule detected
  const [err, setErr]           = useState(null);
  const ref = useRef();

  const canGenerate = mode === "text" ? schedText.trim().length > 20 : !!file;

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true); setErr(null);
    try {
      let body;
      if (mode === "text") {
        body = { week_start: targetWeek, schedule_text: schedText.trim(), module: "fitness" };
      } else {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res({ data: r.result.split(",")[1], type: file.type });
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        body = { week_start: targetWeek, schedule_image: b64, module: "fitness" };
      }
      const res = await api("/workout/generate-week", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Duplicate detection response
      if (res.duplicate) {
        setDuplicate(res.message);
        setLoading(false);
        return;
      }
      setResult(res.reasoning || "Plan generated successfully.");
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const forceRegenerate = async () => {
    setDuplicate(null); setLoading(true); setErr(null);
    try {
      const body = mode === "text"
        ? { week_start: targetWeek, schedule_text: schedText.trim(), module: "fitness", force: true }
        : { week_start: targetWeek, schedule_image: await new Promise((res,rej)=>{
            const r=new FileReader();r.onload=()=>res({data:r.result.split(",")[1],type:file.type});r.onerror=rej;r.readAsDataURL(file);
          }), module: "fitness", force: true };
      const res = await api("/workout/generate-week", { method:"POST", body:JSON.stringify(body) });
      setResult(res.reasoning || "Plan updated.");
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const tabStyle = (m) => ({
    flex:1, padding:"8px 10px", textAlign:"center",
    fontSize:12, fontWeight:700, cursor:"pointer",
    borderBottom: mode===m ? "2px solid var(--a)" : "2px solid transparent",
    color: mode===m ? "var(--a)" : "var(--m)",
    transition:"all .15s",
  });

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Weekly Schedule</div>
          <div className="ms">AI generates your bodyweight workout plan from this</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{display:"flex",borderBottom:"1px solid var(--b)",padding:"0 18px"}}>
          <div style={tabStyle("text")} onClick={()=>{setMode("text");setResult(null);setErr(null);}}>
            ✏️ Type Schedule
          </div>
          <div style={tabStyle("image")} onClick={()=>{setMode("image");setResult(null);setErr(null);}}>
            📸 Upload Photo
          </div>
        </div>

        <div className="mb">
          {/* Auto-detected week label */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",
            background:"var(--bg3)",borderRadius:9,marginBottom:11,
            border:"1px solid var(--b)"}}>
            <span style={{fontSize:18}}>📅</span>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--a)"}}>Auto-detected: {weekRangeLabel(targetWeek)}</div>
              <div style={{fontSize:10,color:"var(--m)"}}>Based on today being {new Date().toLocaleDateString("en-US",{weekday:"long"})}</div>
            </div>
          </div>

          <div style={{fontSize:11.5,color:"var(--m2)",marginBottom:11,lineHeight:1.65}}>
            Week 1 = baseline plan. Each week AI improves using your accumulated observations.
            Your commute times and preferences from Notes are applied automatically.
          </div>

          {mode === "text" ? (
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"var(--m)",letterSpacing:"1.5px",
                textTransform:"uppercase",marginBottom:7}}>
                Type or paste your schedule
              </div>
              <textarea className="ta" value={schedText} onChange={e=>setSchedText(e.target.value)}
                style={{minHeight:160,fontSize:12.5,lineHeight:1.7}}
                placeholder="e.g. Monday: Work 6am-2pm, Tuesday: College 8am-3pm, Wednesday: Off..."
              />
              <div style={{fontSize:10,color:"var(--m)",marginTop:5}}>
                Include shift times, college hours, and any fixed commitments.
              </div>
            </div>
          ) : (
            <div>
              {prev
                ? <img src={prev} className="upr" alt="schedule"/>
                : <div className="uz" onClick={()=>ref.current?.click()}>
                    <div style={{fontSize:24,marginBottom:6}}>📅</div>
                    <div style={{fontSize:12,color:"var(--m2)"}}>
                      <b style={{color:"var(--t)"}}>Tap to upload</b> — photo or screenshot of your schedule
                    </div>
                  </div>
              }
              {prev && (
                <button className="btn bs bsm" style={{marginBottom:8,width:"100%"}}
                  onClick={()=>{setFile(null);setPrev(null);}}>
                  Remove — choose different photo
                </button>
              )}
              <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPrev(URL.createObjectURL(f));}}}/>
            </div>
          )}

          {duplicate && (
            <div style={{background:"rgba(255,209,102,0.1)",border:"1px solid rgba(255,209,102,0.3)",
              borderRadius:9,padding:"11px 13px",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",marginBottom:5}}>
                ⚠ Same schedule detected
              </div>
              <div style={{fontSize:12,color:"var(--m2)",lineHeight:1.6,marginBottom:10}}>
                {duplicate}
              </div>
              <div style={{fontSize:11,color:"var(--m2)",marginBottom:8}}>
                Your existing plan is unchanged. Want to regenerate anyway?
              </div>
              <div style={{display:"flex",gap:7}}>
                <button className="btn bs bsm" onClick={()=>setDuplicate(null)}>Keep Existing</button>
                <button className="btn bp bsm" onClick={forceRegenerate} disabled={loading}>
                  {loading?<Dots/>:"Regenerate Anyway"}
                </button>
              </div>
            </div>
          )}
          <Err msg={err}/>

          {result && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,color:"var(--a)",fontWeight:700,marginBottom:5}}>
                ✓ Plan saved — check Fitness → Blueprint
              </div>
              <AiBox label="AI note for this week" text={result}/>
            </div>
          )}
        </div>

        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={generate} disabled={!canGenerate||loading}>
            {loading ? <><Dots/> Generating…</> : "✦ Generate This Week"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hard Reset Modal — must type RESET to confirm ───────────────────────────
function ResetModal({ onClose, onReset }) {
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState(null);
  const confirmed               = input.trim() === "RESET";

  const doReset = async () => {
    if(!confirmed)return;
    setLoading(true);setErr(null);
    try {
      await api("/data/reset",{method:"POST"});
      // Small delay so React finishes any in-flight state updates
      // before we wipe localStorage and force a re-render
      setTimeout(() => {
        clearSession();
        onReset();
      }, 200);
    }catch(e){
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mh">
          <div>
            <div className="mt" style={{color:"var(--warn)"}}>⚠ Delete All Data</div>
            <div className="ms">This cannot be undone</div>
          </div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:13,color:"var(--m2)",lineHeight:1.75,marginBottom:16}}>
            This will permanently delete everything from your database:<br/>
            <span style={{color:"var(--warn)"}}>
              All day observations · Workout history · Body comp · Goals · Notes · Streaks · Weekly plans
            </span>
            <br/><br/>
            The app will return to a completely fresh state as if it was never used. There is no undo.
          </div>
          <div style={{fontSize:11,color:"var(--m2)",marginBottom:8}}>
            Type <b style={{color:"var(--warn)",fontFamily:"var(--mono)"}}>RESET</b> to confirm:
          </div>
          <input className="inp" placeholder="Type RESET here"
            value={input} onChange={e=>setInput(e.target.value)}
            style={{borderColor:confirmed?"rgba(255,107,107,.5)":"var(--b)",
              fontFamily:"var(--mono)",letterSpacing:2}}/>
          <Err msg={err}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancel — Keep My Data</button>
          <button className="btn bwarn" onClick={()=>{
            if(!confirmed){setErr("Type RESET in capital letters to confirm.");return;}
            doReset();
          }} disabled={loading}>
            {loading?<><Dots/> Deleting…</>:"🗑 Delete Everything"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER TABS
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SHARED MODULE COMPONENTS — used by Fitness, Skills, Hobbies
// ═══════════════════════════════════════════════════════════════════════════════

// Module color config


// Post-session questions + completion inline

// Module tab — full implementation for Fitness, Skills, Hobbies
function ModuleTab({ module }) {
  const cfg = MODULE_CONFIG[module] || MODULE_CONFIG.fitness;
  const [sec, setSec]                 = useState("plan");
  const [weekPlan, setWeekPlan]       = useState(null);
  const [allWeeks, setAllWeeks]       = useState([]);
  const [viewWeek, setViewWeek]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [completing, setCompleting]   = useState(null); // day being completed
  const [review, setReview]           = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [monthReport, setMonthReport] = useState(null);
  const [monthLoading, setMonthLoading]   = useState(false);
  const [stats, setStats]             = useState(null);

  const [compOpen, setCompOpen]       = useState(false);
  const [compResult, setCompResult]   = useState(null);

  const ws = weekStart(todayStr());

  const load = useCallback(async () => {
    try {
      const [p, weeks] = await Promise.all([
        api("/data/week/" + ws),
        api("/data/all-weeks"),
      ]);
      const plan = p[module];
      setWeekPlan(plan || null);
      const allW = (weeks.weeks || []).filter(w => {
        // only show weeks that have this module
        return true; // all-weeks only returns fitness currently — fix later
      });
      setAllWeeks(weeks.weeks || []);
      setViewWeek(v => v || ws);
    } catch { setWeekPlan(null); }
    setLoading(false);
  }, [ws, module]);

  const loadStats = useCallback(async () => {
    try {
      const s = await api("/module/stats?module=" + module + "&week_start=" + ws);
      setStats(s);
    } catch {}
  }, [module, ws]);

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);

  const ctxCls = c => c?.includes("Work")&&c?.includes("College")?"cb":c==="Work"?"cw":c==="College"?"cc":c==="Off"?"co":"cr";
  const days = weekPlan?.days || [];

  const generateReview = async () => {
    setReviewLoading(true);
    try {
      const r = await api("/module/review", {method:"POST", body:JSON.stringify({module, week_start: ws})});
      setReview(r.review);
    } catch(e) { alert(e.message); }
    setReviewLoading(false);
  };

  const generateMonthly = async () => {
    setMonthLoading(true);
    try {
      const r = await api("/analyze/monthly-report", {method:"POST", body:JSON.stringify({month: new Date().toISOString().slice(0,7), module})});
      setMonthReport(r.report);
    } catch(e) { alert(e.message); }
    setMonthLoading(false);
  };



  const SECS = [{id:"plan",l:"Plan"},{id:"progress",l:"Progress"}];

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden"}}>
      <div className="subnav">
        {SECS.map(s=><div key={s.id} className={"sni"+(sec===s.id?" on":"")} onClick={()=>setSec(s.id)}>{s.l}</div>)}
      </div>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch"}}>
        <div className="cnt">

          {/* ── PLAN TAB ── */}
          {sec==="plan" && (
            <div>
              {loading && <div style={{textAlign:"center",padding:"30px"}}><Dots/></div>}

              {/* Week selector */}
              {!loading && allWeeks.length > 0 && (
                <div style={{marginBottom:13}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"var(--m)",marginBottom:8}}>Uploaded weeks</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {allWeeks.map(wk => {
                      const d = new Date(wk.week_start + "T12:00:00");
                      const label = d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
                      const isCurrent = wk.week_start === ws;
                      const isSelected = viewWeek === wk.week_start;
                      return (
                        <div key={wk.week_start} onClick={()=>setViewWeek(wk.week_start)}
                          style={{padding:"6px 11px",borderRadius:8,cursor:"pointer",
                            fontSize:11,fontWeight:700,fontFamily:"var(--mono)",
                            border:isSelected?"2px solid "+cfg.color:"1px solid var(--b)",
                            background:isSelected?cfg.bg:"var(--bg3)",
                            color:isSelected?cfg.color:"var(--m2)",
                            transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>
                          {label}
                          {isCurrent && <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:cfg.bg,color:cfg.color,fontWeight:700}}>NOW</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!loading && allWeeks.length === 0 && (
                <div className="empty-state">
                  <div style={{fontSize:28,marginBottom:8}}>{cfg.icon}</div>
                  <div style={{fontWeight:700,marginBottom:6}}>No {cfg.label} schedule yet</div>
                  {module === "fitness" ? (
                    <span style={{fontSize:11,lineHeight:1.7}}>
                      Upload your weekly schedule in Settings.<br/>
                      Add Fitness Goal notes in the Notes tab first — the AI plans around them.
                    </span>
                  ) : (
                    <span style={{fontSize:11,lineHeight:1.7}}>
                      Add <b>{module === "skills" ? "Skill Goal" : "Hobby Goal"}</b> notes in the Notes tab first.<br/>
                      When you upload your schedule in Settings,<br/>
                      this module generates automatically based on your notes.
                    </span>
                  )}
                </div>
              )}

              {/* Selected week plan */}
              {!loading && viewWeek && allWeeks.length > 0 && (
                <WeekScheduleViewById weekStart={viewWeek} currentWeekStart={ws}
                  module={module} onComplete={(day) => setCompleting(day)}/>
              )}

              {/* Weekly Review */}
              <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--b)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700}}>Weekly Review</div>
                  <button className="btn bp bsm" onClick={generateReview} disabled={reviewLoading}>
                    {reviewLoading ? <Dots/> : "✦ Generate"}
                  </button>
                </div>
                {review ? <AiBox label={"Weekly " + cfg.label + " Review"} text={review}/> : (
                  !reviewLoading && <div className="empty-state" style={{minHeight:60}}>
                    AI reads all your session answers and observations from this week.
                  </div>
                )}
              </div>

              {/* Monthly Report */}
              <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--b)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700}}>Monthly Report</div>
                  <button className="btn bp bsm" onClick={generateMonthly} disabled={monthLoading}>
                    {monthLoading ? <Dots/> : "✦ Generate"}
                  </button>
                </div>
                {module === "fitness" && (
                  <button className="btn bs bsm" style={{marginBottom:8}} onClick={()=>setCompOpen(true)}>📐 Body Comp</button>
                )}
                {compResult && <AiBox label="Body Composition" text={compResult}/>}
                {monthReport ? <AiBox label={"Monthly " + cfg.label + " Report"} text={monthReport}/> : (
                  !monthLoading && <div className="empty-state" style={{minHeight:60}}>
                    Best after 2+ weeks of data.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PROGRESS TAB ── */}
          {sec==="progress" && (
            <div>
              {/* Streak stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:16}}>
                {[
                  {label:"Current Streak", value: stats?.streak?.count || 0, suffix:"d"},
                  {label:"Best Streak",    value: stats?.streak?.best_streak || 0, suffix:"d"},
                  {label:"This Week",      value: stats?.sessions_this_week || 0, suffix:" sessions"},
                ].map((s,i) => (
                  <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--b)",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:"var(--m)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:22,fontWeight:800,fontFamily:"var(--mono)",color:cfg.color,lineHeight:1}}>
                      {s.value}<span style={{fontSize:11,fontWeight:400,color:"var(--m)"}}>{s.suffix}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:20}}>
                {[
                  {label:"This Month",  value: stats?.sessions_this_month || 0, suffix:" sessions"},
                  {label:"All Time",    value: stats?.sessions_all_time || 0, suffix:" sessions"},
                ].map((s,i) => (
                  <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--b)",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:"var(--m)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:20,fontWeight:800,fontFamily:"var(--mono)",color:cfg.color,lineHeight:1}}>
                      {s.value}<span style={{fontSize:11,fontWeight:400,color:"var(--m)"}}>{s.suffix}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Latest AI review */}
              {stats?.latest_review && (
                <AiBox label={"Latest " + cfg.label + " Review"} text={stats.latest_review.review_text}/>
              )}

              {/* Goals come from Notes — no manual input here */}
              <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--b)"}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{cfg.label} Goals</div>
                <div style={{fontSize:11,color:"var(--m2)",lineHeight:1.65,padding:"10px 12px",
                  background:"var(--bg3)",borderRadius:9,border:"1px solid var(--b)"}}>
                  Add goals in the Notes tab — write anything like "I want to reach 50 WPM" or "practice guitar 3x/week". 
                  AI automatically reads your notes and builds your {cfg.label.toLowerCase()} schedule around them.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal day={selectedDay} weekStartDate={viewWeek}
          onClose={()=>setSelectedDay(null)}/>
      )}

      {/* DayDetailModal handles session completion for all modules */}
      {completing && (
        <DayDetailModal
          day={completing}
          weekStartDate={viewWeek || ws}
          onClose={()=>setCompleting(null)}
          onCompleted={()=>{ setCompleting(null); load(); loadStats(); }}
        />
      )}

      {compOpen && (
        <BodyCompModal weekStartDate={ws} onClose={()=>setCompOpen(false)}
          onDone={r=>{setCompResult(r);setCompOpen(false);}}/>
      )}
    </div>
  );
}

function HobbiesTab() { return <ModuleTab module="hobbies"/>; }
function SkillsTab()  { return <ModuleTab module="skills"/>; }

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function HistoryTab() {
  const [mod, setMod]           = useState("fitness");
  const [data, setData]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [logOpen, setLogOpen]   = useState(false);

  const cfg = MODULE_CONFIG[mod] || MODULE_CONFIG.fitness;

  const load = async (m) => {
    setLoading(true); setData(null); setProfile(null);
    try {
      const [h, p] = await Promise.all([
        api("/history?module=" + m),
        api("/user/profile?module=" + m),
      ]);
      setData(h);
      setProfile(p.profile || null);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(mod); }, [mod]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const completedDates = new Set((data?.sessions || []).filter(s => s.completed).map(s => s.date));

  // Build heatmap — last 16 weeks, Mon-Sun rows
  const buildHeatmap = () => {
    const today = new Date();
    const cells = [];
    // Go back 15 weeks from current Monday
    const curDay = today.getDay();
    const curMonday = new Date(today);
    curMonday.setDate(today.getDate() + (curDay === 0 ? -6 : 1 - curDay));
    for (let w = 15; w >= 0; w--) {
      const weekStart = new Date(curMonday);
      weekStart.setDate(curMonday.getDate() - w * 7);
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + d);
        const ds = day.getFullYear() + "-" + String(day.getMonth()+1).padStart(2,"0") + "-" + String(day.getDate()).padStart(2,"0");
        const isFuture = day > today;
        const done = completedDates.has(ds);
        week.push({ ds, done, isFuture });
      }
      cells.push(week);
    }
    return cells;
  };

  // Build weekly bar chart data
  const buildBars = () => {
    const stats = data?.weekly_stats || [];
    return stats.slice(-12); // last 12 weeks
  };

  // Format date
  const fmt = ds => {
    if (!ds) return "";
    const d = new Date(ds + "T12:00:00");
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  };

  const heatmap = data ? buildHeatmap() : [];
  const bars = data ? buildBars() : [];
  const sessions = data?.sessions || [];
  const totalDone = sessions.filter(s => s.completed).length;
  const streak = data?.streak || { count: 0, best_streak: 0 };

  return (
    <div className="cnt">
      {/* Module filter bar */}
      <div style={{display:"flex",gap:7,marginBottom:16}}>
        {["fitness","skills","hobbies"].map(m => {
          const c = MODULE_CONFIG[m];
          const active = mod === m;
          return (
            <button key={m} onClick={()=>setMod(m)}
              style={{flex:1,padding:"8px 4px",borderRadius:8,border:"1px solid",
                fontSize:11,fontWeight:700,letterSpacing:"0.5px",cursor:"pointer",
                transition:"all .15s",
                background: active ? c.bg : "var(--bg2)",
                borderColor: active ? c.border : "var(--b)",
                color: active ? c.color : "var(--m)"}}>
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>

      {loading && <div style={{textAlign:"center",padding:30}}><Dots/></div>}

      {!loading && (
        <>
          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
            {[
              { label:"Sessions Done", value: totalDone },
              { label:"Current Streak", value: streak.count + "d" },
              { label:"Best Streak", value: (streak.best_streak || 0) + "d" },
            ].map((s,i) => (
              <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--b)",
                borderRadius:10,padding:"10px 11px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"var(--m)",letterSpacing:"1.5px",
                  textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:22,fontWeight:800,fontFamily:"var(--mono)",
                  color:cfg.color,lineHeight:1}}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Activity Heatmap */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
              color:"var(--m)",marginBottom:8}}>Activity — last 16 weeks</div>
            <div style={{display:"flex",gap:3,overflowX:"auto",paddingBottom:4}}>
              {/* Day labels */}
              <div style={{display:"flex",flexDirection:"column",gap:3,marginRight:2}}>
                {["M","T","W","T","F","S","S"].map((d,i) => (
                  <div key={i} style={{width:10,height:10,fontSize:7,color:"var(--m)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>{d}</div>
                ))}
              </div>
              {heatmap.map((week, wi) => (
                <div key={wi} style={{display:"flex",flexDirection:"column",gap:3}}>
                  {week.map((cell, di) => (
                    <div key={di} title={cell.ds}
                      style={{width:10,height:10,borderRadius:2,
                        background: cell.isFuture ? "var(--bg3)"
                          : cell.done ? cfg.color
                          : "var(--bg3)",
                        opacity: cell.isFuture ? 0.3 : cell.done ? 1 : 0.55,
                        border: cell.done ? "none" : "1px solid var(--b)",
                      }}/>
                  ))}
                </div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
              <div style={{width:10,height:10,borderRadius:2,background:"var(--bg3)",border:"1px solid var(--b)"}}/>
              <span style={{fontSize:9,color:"var(--m)"}}>No session</span>
              <div style={{width:10,height:10,borderRadius:2,background:cfg.color,marginLeft:8}}/>
              <span style={{fontSize:9,color:"var(--m)"}}>Completed</span>
            </div>
          </div>

          {/* Weekly bar chart — scheduled vs completed */}
          {bars.length > 0 && (
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                color:"var(--m)",marginBottom:10}}>Weekly completion</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:72}}>
                {bars.map((w,i) => {
                  const pct = w.scheduled > 0 ? Math.round((w.completed / w.scheduled) * 100) : 0;
                  const barH = Math.max(4, Math.round(pct * 0.64)); // max 64px
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",
                      alignItems:"center",gap:3}}>
                      <div style={{fontSize:8,color:pct>=80?cfg.color:"var(--m)",fontWeight:700}}>
                        {pct > 0 ? pct+"%" : "—"}
                      </div>
                      <div style={{width:"100%",background:"var(--bg3)",borderRadius:3,
                        height:64,display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
                        <div style={{width:"100%",height:barH,
                          background: pct>=80 ? cfg.color : pct>=50 ? "var(--gold)" : "var(--warn)",
                          borderRadius:"3px 3px 0 0",transition:"height .3s"}}/>
                      </div>
                      <div style={{fontSize:7,color:"var(--m)",
                        writingMode:"horizontal-tb",textAlign:"center"}}>
                        W{w.week_number||i+1}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:10,marginTop:6}}>
                {[["var(--warn)","<50%"],["var(--gold)","50–79%"],[cfg.color,"80%+"]].map(([c,l],i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:8,height:8,borderRadius:1,background:c}}/>
                    <span style={{fontSize:9,color:"var(--m)"}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Pattern Profile */}
          {profile ? (
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                color:"var(--m)",marginBottom:8}}>What the AI has learned about you</div>
              <div className="aib" style={{border:"1px solid "+cfg.border}}>
                <div className="aib-t" style={{color:cfg.color,marginBottom:6}}>
                  ✦ {cfg.label} Profile · {data?.week_count || 0} week{data?.week_count!==1?"s":""} of data
                </div>
                <div style={{fontSize:12,lineHeight:1.75,color:"var(--m2)",whiteSpace:"pre-wrap"}}>
                  {profile}
                </div>
              </div>
            </div>
          ) : (
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                color:"var(--m)",marginBottom:8}}>AI Profile</div>
              <div className="empty-state" style={{minHeight:70}}>
                <div style={{fontSize:20,marginBottom:6}}>{cfg.icon}</div>
                Complete a few sessions and the AI will build a personalized profile of your habits and patterns.
              </div>
            </div>
          )}

          {/* Session Log */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                color:"var(--m)"}}>Session log ({totalDone} total)</div>
              {sessions.length > 5 && (
                <button className="btn bs bsm" onClick={()=>setLogOpen(o=>!o)}>
                  {logOpen ? "Show less" : "Show all"}
                </button>
              )}
            </div>
            {sessions.length === 0 && (
              <div className="empty-state">No sessions logged yet. Complete your first session to start tracking.</div>
            )}
            {(logOpen ? sessions : sessions.slice(-5)).reverse().map((s,i) => (
              <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--b)",
                borderRadius:10,padding:"10px 13px",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:s.answers?.length?6:0}}>
                  <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,
                    background:s.completed?cfg.color:"var(--warn)"}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--t)"}}>{s.session_name}</div>
                    <div style={{fontSize:10,color:"var(--m)",fontFamily:"var(--mono)"}}>{fmt(s.date)}</div>
                  </div>
                  {!s.completed && (
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:4,
                      background:"rgba(248,113,113,0.1)",color:"var(--warn)",fontWeight:700}}>skipped</span>
                  )}
                </div>
                {s.answers?.filter(a=>a.answer).map((a,j) => (
                  <div key={j} style={{fontSize:11,color:"var(--m2)",lineHeight:1.6,
                    paddingLeft:16,borderLeft:"2px solid var(--b)",marginTop:4}}>
                    <span style={{color:"var(--m)",fontWeight:600}}>{a.question}: </span>{a.answer}
                  </div>
                ))}
                {s.observation && (
                  <div style={{fontSize:11,color:"var(--m2)",lineHeight:1.6,marginTop:6,
                    padding:"6px 9px",background:"var(--bg3)",borderRadius:7}}>
                    {s.observation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// NAV
// ═══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id:"home",     icon:"🏠", label:"Home",    built:true },
  { id:"notes",    icon:"📝", label:"Notes",   built:true },
  { id:"history",  icon:"📊", label:"History", built:true },
  { id:"settings", icon:"⚙️", label:"Settings",built:true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed]     = useState(()=>!!localStorage.getItem("lifeos_token")&&!isSessionExpired());

  // Wire the global auth failure handler so any 401 triggers the login screen
  // This runs immediately on mount, before any API calls
  onAuthFailure = () => setAuthed(false);
  const [tab, setTab]           = useState("home");
  const [workerOk, setWorkerOk] = useState(null);
  const [streak, setStreak]     = useState({count:0,message:""});
  const [weekPlan, setWeekPlan] = useState(null);
  const [lightMode, setLightMode] = useState(localStorage.getItem("lifeos_light")==="true");
  const toggleLight = () => { const n=!lightMode; setLightMode(n); localStorage.setItem("lifeos_light",String(n)); };

  // Apply light-mode class to <html> so ALL CSS variables including html/body cascade correctly
  useEffect(()=>{
    if (lightMode) {
      document.documentElement.classList.add("light-mode");
    } else {
      document.documentElement.classList.remove("light-mode");
    }
    return () => document.documentElement.classList.remove("light-mode");
  },[lightMode]);

  // Inactivity lock
  useEffect(()=>{
    if(!authed)return;
    const iv=setInterval(()=>{if(isSessionExpired()){clearSession();setAuthed(false);}},30_000);
    return()=>clearInterval(iv);
  },[authed]);

  // Activity stamping
  useEffect(()=>{
    if(!authed)return;
    const evts=["click","keydown","touchstart","scroll","mousemove"];
    const h=()=>stampActivity();
    evts.forEach(e=>window.addEventListener(e,h,{passive:true}));
    return()=>evts.forEach(e=>window.removeEventListener(e,h));
  },[authed]);

  // Record when tab goes hidden — so inactivity timer knows how long we were away
  useEffect(()=>{
    if(!authed)return;
    const onHide=()=>{
      if(document.visibilityState==="hidden") {
        // Just record the time — don't wipe the session
        // The inactivity timer will handle expiry on next check
        localStorage.setItem("lifeos_hidden_at", Date.now());
      } else {
        // Tab came back — check if too much time passed while hidden
        const hiddenAt = parseInt(localStorage.getItem("lifeos_hidden_at") || "0");
        if (hiddenAt && (Date.now() - hiddenAt > INACTIVITY_MS)) {
          clearSession();
          setAuthed(false);
        }
        localStorage.removeItem("lifeos_hidden_at");
      }
    };
    document.addEventListener("visibilitychange",onHide);
    return()=>document.removeEventListener("visibilitychange",onHide);
  },[authed]);

  useEffect(()=>{
    if(!authed)return;
    fetch(`${WORKER_URL}/health`).then(r=>setWorkerOk(r.ok)).catch(()=>setWorkerOk(false));
  },[authed]);

  useEffect(()=>{
    if(!authed)return;
    api("/data/streak").then(d=>setStreak(d)).catch(()=>{});
    const ws=weekStart(todayStr());
    api(`/data/week/${ws}`).then(d=>setWeekPlan(d)).catch(()=>{});
  },[authed]);

  // Listen for tab-navigation events from reminder banners
  useEffect(()=>{
    const handler = (e) => setTab(e.detail);
    window.addEventListener("lifeos:gotab", handler);
    return () => window.removeEventListener("lifeos:gotab", handler);
  },[]);

  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)}/>;

  const todayLabel=new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  const TITLES={home:["My ","Home"],notes:["My ","Notes"],
    history:["My ","History"],settings:["Set","tings"]};

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* Desktop sidebar */}
        <div className="sb">
          <div className="logo">Life<em>OS</em></div>
          <div className="ns">Modules</div>
          {NAV.map(n=>(
            <div key={n.id} className={"ni"+(tab===n.id?" on":"")} onClick={()=>setTab(n.id)}>
              <span>{n.icon}</span><span>{n.label}</span>
              {!n.built&&<span className="sn">SOON</span>}
            </div>
          ))}
          <div className="sb-foot">
            {streak.count>0&&(
              <div className="streak-sb">
                <span>🔥</span>
                <div><div className="streak-num">{streak.count}</div>
                <div className="streak-lbl">day streak</div></div>
              </div>
            )}
            <div className={"wbadge"+(workerOk?" ok":"")}>
              {workerOk===null?"Checking…":workerOk?"✦ Worker Connected":"⚠ Worker not connected"}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main">

          {/* Mobile header */}
          <div className="mob-header">
            <div className="mob-logo">Life<em>OS</em></div>
            <div className="mob-date">{todayLabel}</div>
            {streak.count>0&&<div className="mob-streak"><span>🔥</span>{streak.count}</div>}
            <div className={"mob-wbadge"+(workerOk?" ok":" err")} title={workerOk?"Connected":"Not connected"}/>
          </div>

          {/* Desktop topbar */}
          <div className="topbar">
            <div className="ptitle">{TITLES[tab][0]}<em>{TITLES[tab][1]}</em></div>
            <div className="pdate">{todayLabel}</div>
          </div>

          <div className="tab-content">
            {tab==="home"     && <HomeTab streak={streak} weekPlan={weekPlan}/>}
            {tab==="history"  && <HistoryTab/>}
            {tab==="notes"    && <NotesTab/>}
            {tab==="settings" && <SettingsTab onReset={()=>setAuthed(false)} lightMode={lightMode} toggleLight={toggleLight}/>}
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="mnav">
          {NAV.map(n=>(
            <div key={n.id} className={"mni"+(tab===n.id?" on":"")} onClick={()=>setTab(n.id)}>
              <div className="mni-ico">{n.icon}</div>
              <div className="mni-lbl">{n.label}</div>
              {!n.built&&<div className="mni-pip"/>}
            </div>
          ))}
        </nav>

      </div>
    </>
  );
}
