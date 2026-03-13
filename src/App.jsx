import { useState, useEffect, useRef, useCallback } from "react";

const WORKER_URL = "https://lifeos-api.sarpreet5601.workers.dev";
const INACTIVITY_MS = 5 * 60 * 1000;

function getToken()       { return localStorage.getItem("lifeos_token") || ""; }
function stampActivity()  { localStorage.setItem("lifeos_last_active", Date.now()); }
function isSessionExpired() {
  const last = parseInt(localStorage.getItem("lifeos_last_active") || "0");
  return last && (Date.now() - last > INACTIVITY_MS);
}
function clearSession() {
  localStorage.removeItem("lifeos_token");
  localStorage.removeItem("lifeos_last_active");
}

async function api(path, options = {}) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}`, ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || "API error");
  }
  return res.json();
}

const todayStr  = () => new Date().toISOString().slice(0, 10);
const weekStart = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
};
function dayDate(weekStartStr, dayName) {
  const OFF = { Mon:0, Tue:1, Wed:2, Thu:3, Fri:4, Sat:5, Sun:6 };
  const d = new Date(weekStartStr + "T12:00:00");
  d.setDate(d.getDate() + (OFF[dayName] ?? 0));
  return d;
}
function dayDateLabel(weekStartStr, dayName) {
  return dayDate(weekStartStr, dayName).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}
function isTodayDay(weekStartStr, dayName) {
  return dayDate(weekStartStr, dayName).toISOString().slice(0,10) === todayStr();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060610;--bg2:#0D0D1F;--bg3:#13132A;--bg4:#1A1A35;
  --b:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.12);
  --a:#5CFFB0;--a2:#5C9EFF;--warn:#FF6B6B;--gold:#FFD166;--purple:#B06BFF;
  --t:#EEEEFF;--m:#44446A;--m2:#8888BB;
  --font:'Syne',sans-serif;--mono:'DM Mono',monospace;
  --glow:0 0 20px rgba(92,255,176,0.15);
  --glow2:0 0 20px rgba(92,158,255,0.15);
  --sb:220px;--mob-nav:62px;--mob-header:54px;
  --r:12px;
}
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
  color:var(--m2);cursor:pointer;border-left:2px solid transparent;transition:all .15s;position:relative}
.ni:hover{color:var(--t);background:rgba(255,255,255,.02)}
.ni.on{color:var(--a);border-left-color:var(--a);background:rgba(92,255,176,.04)}
.ni .sn{margin-left:auto;font-size:8px;font-weight:700;color:var(--m);background:var(--bg4);padding:2px 5px;border-radius:3px}
.sb-foot{margin-top:auto;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.streak-sb{background:var(--bg3);border:1px solid rgba(92,255,176,.15);border-radius:9px;
  padding:8px 11px;display:flex;align-items:center;gap:8px}
.streak-num{font-size:17px;font-weight:800;font-family:var(--mono);color:var(--a);line-height:1}
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
  border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;transition:all .15s}
.sni:hover{color:var(--t)}.sni.on{color:var(--a);border-bottom-color:var(--a)}
.tab-content{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.cnt{padding:16px 20px 40px}

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
  .tab-content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .cnt{padding:13px 13px calc(var(--mob-nav) + 18px) 13px}
  .subnav{padding:0 13px;background:var(--bg2)}
  .sni{padding:9px 9px;font-size:11px}

  /* Bottom nav */
  .mnav{
    display:flex;position:fixed;bottom:0;left:0;right:0;
    height:var(--mob-nav);background:var(--bg2);border-top:1px solid var(--b);
    z-index:100;padding-bottom:env(safe-area-inset-bottom,0px);
  }
  .mni{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:5px 2px 3px;cursor:pointer;gap:3px;position:relative;transition:background .15s}
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
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
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
function AiBox({ label, text }) {
  if (!text) return null;
  return <div className="aib"><div className="aib-t">✦ {label}</div><p>{text}</p></div>;
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
function TodayTab({ streak, weekPlan }) {
  const today = todayStr();
  const [dayData, setDayData]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [uploadOpen, setUploadOpen]   = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api(`/data/day/${today}`); setDayData(d); }
    catch { setDayData(null); }
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const ws = weekStart(today);
  const bpIdx = (() => { const d=new Date().getDay(); return d===0?6:d-1; })();
  const todayPlan = weekPlan?.fitness?.days?.[bpIdx] || null;

  const tasks = [
    { id:"daily",   icon:"🌙", label:"Sleep + Activity",
      desc:"Upload both Samsung Health screenshots", done:!!dayData?.combined_analysis },
    { id:"workout", icon:"🏋️",
      label: todayPlan?.session_name || "Today's Workout",
      desc: todayPlan ? `${todayPlan.time_window} · Bodyweight` : "Generate schedule first in Settings",
      done: !!dayData?.workout_completed },
  ];

  if (loading) return (
    <div className="cnt" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}><Dots/></div>
  );

  return (
    <div className="cnt">
      {streak?.count>0 && (
        <div className="streak-banner">
          <span style={{fontSize:20}}>🔥</span>
          <div><div className="streak-count">{streak.count}</div>
          <div style={{fontSize:9,color:"var(--m2)"}}>day streak</div></div>
          {streak.message && <div className="streak-msg">{streak.message}</div>}
        </div>
      )}

      {dayData?.recovery_score && <RecoveryRing score={dayData.recovery_score}/>}

      <div className="tgl">Fitness</div>
      {tasks.map(t => (
        <div key={t.id} className={"ti"+(t.done?" done":"")}
          onClick={()=>{
            if(t.done)return;
            if(t.id==="daily") setUploadOpen(true);
            if(t.id==="workout") setWorkoutOpen(true);
          }}>
          <div className="tic">{t.icon}</div>
          <div className="tinfo">
            <div className="tlbl">{t.label}</div>
            <div className="tdsc">{t.desc}</div>
          </div>
          <span className={"tbdg "+(t.done?"d":"p")}>{t.done?"Done ✓":"Tap"}</span>
          {!t.done && <span style={{color:"var(--a)",fontSize:15}}>›</span>}
        </div>
      ))}

      {dayData?.combined_analysis && <AiBox label="Day Observation" text={dayData.combined_analysis}/>}

      {uploadOpen && <DailyUploadModal today={today} todayPlan={todayPlan}
        onClose={()=>{setUploadOpen(false);load();}}/>}
      {workoutOpen && <DayDetailModal day={todayPlan||{day:"Today",session_name:"No Plan"}}
        weekStartDate={ws} onClose={()=>{setWorkoutOpen(false);load();}}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY UPLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DailyUploadModal({ today, todayPlan, onClose }) {
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
function DayDetailModal({ day, weekStartDate, onClose }) {
  const dateLabel = day.date_label || (weekStartDate ? dayDateLabel(weekStartDate, day.day) : day.day);
  const actualDate = weekStartDate ? dayDate(weekStartDate, day.day).toISOString().slice(0,10) : todayStr();
  const isToday = actualDate === todayStr();
  const isPast  = actualDate < todayStr();

  const [note, setNote]               = useState("");
  const [completing, setCompleting]   = useState(false);
  const [completed, setCompleted]     = useState(false);
  const [noteResult, setNoteResult]   = useState(null);
  const [err, setErr]                 = useState(null);

  useEffect(()=>{
    api(`/data/day/${actualDate}`).then(d=>{
      if(d.workout_completed) setCompleted(true);
      if(d.workout_note) setNote(d.workout_note);
      if(d.note_analysis) setNoteResult(d.note_analysis);
    }).catch(()=>{});
  },[actualDate]);

  const parseWorkout = text => {
    if(!text)return[];
    const sections=[];let cur=null;
    text.split("\n").map(l=>l.trim()).filter(Boolean).forEach(l=>{
      if(l.match(/^(WARM.?UP|MAIN WORK|COOL.?DOWN)/i)){cur={title:l.replace(/:$/,""),items:[]};sections.push(cur);}
      else if(l.startsWith("-")&&cur) cur.items.push(l.slice(1).trim());
      else if(cur&&l) cur.items.push(l);
    });
    return sections;
  };

  const sections = parseWorkout(day.session_detail||"");

  const handleComplete = async () => {
    setCompleting(true);setErr(null);
    try {
      const res=await api("/workout/complete",{method:"POST",body:JSON.stringify({date:actualDate,note:note.trim()})});
      setNoteResult(res.note_analysis);setCompleted(true);
      if(res.streak_message) alert("🔥 "+res.streak_message);
    }catch(e){setErr(e.message);}
    setCompleting(false);
  };

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mh">
          <div>
            <div className="mt">{day.session_name||"Workout"}</div>
            <div className="ms">{dateLabel}{day.time_window?" · "+day.time_window:""}{isToday?" · Today":""}{completed?" · ✓ Done":""}</div>
          </div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          {day.ai_note&&(
            <div style={{fontSize:12,color:"var(--m2)",background:"var(--bg3)",borderRadius:9,
              padding:"9px 12px",marginBottom:13,borderLeft:"2px solid var(--a)",lineHeight:1.65}}>
              {day.ai_note}
            </div>
          )}
          {sections.length>0?sections.map((sec,i)=>(
            <div key={i} className="ex-section">
              <div className="ex-section-title">{sec.title}</div>
              {sec.items.map((item,j)=>{
                const sets=item.match(/(\d+)\s*x\s*(\d+)/);
                const parts=item.split("—");
                return (
                  <div key={j} className="exr">
                    <span className="exn">{parts[0].trim()}</span>
                    {sets&&<span className="exrp">{sets[0]}</span>}
                    {parts[1]&&<span className="exnote">{parts[1].trim()}</span>}
                  </div>
                );
              })}
            </div>
          )):(
            <div className="empty-state">No workout details for this day.</div>
          )}

          {!completed&&(isToday||isPast)&&(
            <div style={{marginTop:13}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--m)",letterSpacing:"1.5px",
                textTransform:"uppercase",marginBottom:6}}>Post-workout note</div>
              <input className="inp" placeholder="How did it feel?"
                value={note} onChange={e=>setNote(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleComplete()}/>
            </div>
          )}
          {!completed&&!isToday&&!isPast&&(
            <div className="empty-state">Future session — come back on {dateLabel.split(",")[0]}.</div>
          )}
          {noteResult&&<AiBox label="Post-Workout Insight — saved" text={noteResult}/>}
          <Err msg={err}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          {!completed&&(isToday||isPast)&&(
            <button className="btn bp" onClick={handleComplete} disabled={completing}>
              {completing?<><Dots/> Saving…</>:"✅ Mark Complete"}
            </button>
          )}
          {completed&&<div style={{flex:1,textAlign:"center",color:"var(--a)",fontSize:13,fontWeight:700,padding:"10px 0"}}>✓ Completed</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FITNESS TAB — Blueprint, Review, Monthly, Goals. No schedule upload here.
// ═══════════════════════════════════════════════════════════════════════════════
function FitnessTab() {
  const [sec, setSec]                   = useState("blueprint");
  const [weekPlan, setWeekPlan]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [selectedDay, setSelectedDay]   = useState(null);
  const [compOpen, setCompOpen]         = useState(false);
  const [compResult, setCompResult]     = useState(null);
  const [review, setReview]             = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [monthReport, setMonthReport]   = useState(null);
  const [monthLoading, setMonthLoading] = useState(false);

  const ws = weekStart(todayStr());

  const load = useCallback(async () => {
    try { const p=await api(`/data/week/${ws}`); setWeekPlan(p); }
    catch { setWeekPlan(null); }
    setLoading(false);
  }, [ws]);

  useEffect(()=>{load();},[load]);

  const days   = weekPlan?.fitness?.days||[];
  const ctxCls = c=>c?.includes("Work")&&c?.includes("College")?"cb":c==="Work"?"cw":c==="College"?"cc":c==="Off"?"co":"cr";

  const generateReview = async () => {
    setReviewLoading(true);
    try { const r=await api("/analyze/weekly-review",{method:"POST",body:JSON.stringify({week_start:ws})}); setReview(r.review); }
    catch(e){alert(e.message);}
    setReviewLoading(false);
  };

  const generateMonthly = async () => {
    setMonthLoading(true);
    try { const r=await api("/analyze/monthly-report",{method:"POST",body:JSON.stringify({month:new Date().toISOString().slice(0,7)})}); setMonthReport(r.report); }
    catch(e){alert(e.message);}
    setMonthLoading(false);
  };

  const SECS=[{id:"blueprint",l:"Blueprint"},{id:"review",l:"Weekly Review"},{id:"monthly",l:"Monthly"},{id:"goals",l:"Goals"}];

  return (
    <>
      <div className="subnav">
        {SECS.map(s=><div key={s.id} className={"sni"+(sec===s.id?" on":"")} onClick={()=>setSec(s.id)}>{s.l}</div>)}
      </div>
      <div className="tab-content">
        <div className="cnt">

          {sec==="blueprint"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>This Week's Plan</div>
                  <div style={{fontSize:10,color:"var(--m)",marginTop:1,fontFamily:"var(--mono)"}}>
                    {weekPlan?.fitness?`Week ${weekPlan.fitness.week_number||1} · Tap any day for details`:"Upload schedule in Settings"}
                  </div>
                </div>
              </div>

              {loading&&<div style={{textAlign:"center",padding:"30px",color:"var(--m)"}}><Dots/></div>}

              {!loading&&!weekPlan?.fitness&&(
                <div className="empty-state">
                  <div style={{fontSize:30,marginBottom:8}}>📅</div>
                  No plan yet.<br/>
                  <span style={{fontSize:11}}>Go to Settings → Upload Schedule to generate this week's workouts.</span>
                </div>
              )}

              {days.map((day,i)=>{
                const isToday=isTodayDay(ws,day.day);
                const dateLabel=day.date_label||dayDateLabel(ws,day.day);
                const shortDate=dateLabel.replace(/\w+,\s*/,"");
                return (
                  <div key={i} className={"bpr"+(day.is_rest?" rest":"")+(isToday?" today":"")}
                    onClick={()=>!day.is_rest&&setSelectedDay(day)}>
                    {isToday&&<div className="tdot"/>}
                    <div className="bp-date-col">
                      <div className="bpday">{day.day}</div>
                      <div className="bpdate">{shortDate}</div>
                    </div>
                    <div className={"bpctx "+ctxCls(day.context)}>{day.context||"—"}</div>
                    <div className="bptyp">{day.session_name||(day.is_rest?"Rest Day":"—")}</div>
                    <div className="bpwin">{day.time_window}</div>
                    {!day.is_rest&&<span style={{color:"var(--a)",fontSize:15,marginLeft:2}}>›</span>}
                  </div>
                );
              })}
            </div>
          )}

          {sec==="review"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>Weekly Review</div>
                  <div style={{fontSize:10,color:"var(--m)",marginTop:1}}>AI reads all 7 days of data</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn bs bsm" onClick={()=>setCompOpen(true)}>📐 Body Comp</button>
                  <button className="btn bp bsm" onClick={generateReview} disabled={reviewLoading}>
                    {reviewLoading?<Dots/>:"✦ Generate"}
                  </button>
                </div>
              </div>
              {compResult&&<AiBox label="Body Composition Analysis" text={compResult}/>}
              {review?<AiBox label="Weekly Review" text={review}/>:(
                !reviewLoading&&<div className="empty-state">
                  <div style={{fontSize:28,marginBottom:7}}>📊</div>
                  AI reads all day observations, workout notes, and body comp from this week.
                </div>
              )}
            </div>
          )}

          {sec==="monthly"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>Monthly Report</div>
                  <div style={{fontSize:10,color:"var(--m)",marginTop:1}}>AI reads 30 days of data</div>
                </div>
                <button className="btn bp bsm" onClick={generateMonthly} disabled={monthLoading}>
                  {monthLoading?<Dots/>:"✦ Generate"}
                </button>
              </div>
              {monthReport?<AiBox label="Monthly Report" text={monthReport}/>:(
                !monthLoading&&<div className="empty-state">
                  <div style={{fontSize:28,marginBottom:7}}>📅</div>
                  Best after 2+ weeks of data.
                </div>
              )}
            </div>
          )}

          {sec==="goals"&&<GoalsSection/>}

        </div>
      </div>

      {selectedDay&&(
        <DayDetailModal day={selectedDay} weekStartDate={ws}
          onClose={()=>setSelectedDay(null)} onComplete={()=>{setSelectedDay(null);load();}}/>
      )}
      {compOpen&&(
        <BodyCompModal weekStartDate={ws} onClose={()=>setCompOpen(false)}
          onDone={r=>{setCompResult(r);setCompOpen(false);}}/>
      )}
    </>
  );
}

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
        <div style={{fontSize:10,color:"var(--m)",marginTop:2}}>Add a goal — AI assesses it instantly</div>
      </div>
      <div className="goal-input-wrap">
        <input className="goal-input" placeholder="e.g. Do 15 pull-ups by July"
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&addGoal()} disabled={adding}/>
        <button className="btn bp bsm" onClick={addGoal} disabled={adding||!input.trim()}>
          {adding?<Dots/>:"Add"}
        </button>
      </div>
      {goals.length===0&&<div className="empty-state">No goals yet. Add your first one above.</div>}
      {goals.map(g=>(
        <div key={g.id} className={"goal-card"+(g.done?" done":"")}>
          <div className="goal-text">
            <span style={{textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
            <div style={{display:"flex",gap:3}}>
              <button className="gc-btn" onClick={()=>toggleDone(g.id,g.done)}>{g.done?"↩":"✓"}</button>
              <button className="gc-btn" onClick={()=>deleteGoal(g.id)}>✕</button>
            </div>
          </div>
          <div className="goal-date">{new Date(g.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
          {g.ai_insight===null
            ?<div style={{fontSize:11,color:"var(--m)",display:"flex",alignItems:"center",gap:5}}><Dots/> Analyzing…</div>
            :<div className="goal-ai">{g.ai_insight}</div>}
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
  const [processedNotes, setProcessedNotes] = useState([]); // {id, context, updated_at}
  const [rawNotes, setRawNotes]             = useState([]); // unprocessed notes
  const [input, setInput]                   = useState("");
  const [adding, setAdding]                 = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [loading, setLoading]               = useState(true);

  const load = async () => {
    try {
      const [n, c] = await Promise.all([
        api("/notes").catch(()=>({notes:[]})),
        api("/notes/context").catch(()=>({context:null})),
      ]);
      setRawNotes(n.notes||[]);
      // Build processed notes history from notes_context
      if(c.context) {
        setProcessedNotes([{id:1, context:c.context, updated_at: new Date().toISOString()}]);
      }
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{load();},[]);

  const addNote = async () => {
    if(!input.trim())return;setAdding(true);
    try {
      await api("/notes",{method:"POST",body:JSON.stringify({content:input.trim()})});
      setInput("");
      await load();
    }catch{}
    setAdding(false);
  };

  const processNotes = async () => {
    if(rawNotes.length===0)return;
    setProcessing(true);
    try {
      const res=await api("/notes/process",{method:"POST"});
      // After processing, clear raw notes display (they're still in DB for AI)
      setProcessedNotes([{id:Date.now(),context:res.context,updated_at:new Date().toISOString()}]);
      setRawNotes([]);
    }catch(e){alert(e.message);}
    setProcessing(false);
  };

  if(loading)return<div className="cnt" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}><Dots/></div>;

  return (
    <div className="cnt">
      <div style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700}}>Notes</div>
        <div style={{fontSize:10,color:"var(--m)",marginTop:2,lineHeight:1.5}}>
          Add anything about your schedule, preferences, or constraints. AI reads this when planning.
        </div>
      </div>

      {/* Input — no placeholder text */}
      <textarea className="ta" value={input} onChange={e=>setInput(e.target.value)}
        style={{minHeight:80,marginBottom:8}}/>

      <div style={{display:"flex",gap:7,marginBottom:18,flexWrap:"wrap"}}>
        <button className="btn bp bsm" onClick={addNote} disabled={adding||!input.trim()}>
          {adding?<Dots/>:"Add Note"}
        </button>
        <button className="btn bs" onClick={processNotes}
          disabled={processing||rawNotes.length===0} style={{flex:"1 1 180px"}}>
          {processing?<><Dots/> Processing…</>:"✦ Process All Notes → AI Context"}
        </button>
      </div>

      {/* Unprocessed raw notes — shown until processed */}
      {rawNotes.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",
            color:"var(--m)",marginBottom:8}}>
            {rawNotes.length} note{rawNotes.length>1?"s":""} pending processing
          </div>
          {rawNotes.map(n=>(
            <div key={n.id} style={{background:"var(--bg2)",border:"1px solid var(--b)",
              borderRadius:9,padding:"10px 13px",marginBottom:6,fontSize:12.5,
              color:"var(--m2)",lineHeight:1.65}}>
              {n.content}
            </div>
          ))}
        </div>
      )}

      {/* AI processed results */}
      {processedNotes.length>0&&(
        <div>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",
            color:"var(--a)",marginBottom:8}}>✦ AI Context — injected into every AI call</div>
          {processedNotes.map(pn=>(
            <div key={pn.id} className="processed-note">
              <div className="pn-meta">
                ✦ Processed context
                <span style={{color:"var(--m)",marginLeft:"auto"}}>
                  {new Date(pn.updated_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                </span>
              </div>
              <div className="pn-body">{pn.context}</div>
            </div>
          ))}
        </div>
      )}

      {rawNotes.length===0&&processedNotes.length===0&&(
        <div className="empty-state">
          <div style={{fontSize:26,marginBottom:7}}>📝</div>
          No notes yet. Add your first note above.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// Schedule upload, app settings, danger zone
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsTab({ onReset }) {
  const [schedOpen, setSchedOpen]     = useState(false);
  const [resetOpen, setResetOpen]     = useState(false);
  const [bodyweightOnly, setBodyweightOnly] = useState(
    localStorage.getItem("lifeos_bodyweight") !== "false"
  );
  const [unitSystem, setUnitSystem]   = useState(
    localStorage.getItem("lifeos_units") || "metric"
  );
  const [sessionTimeout, setSessionTimeout] = useState(
    localStorage.getItem("lifeos_timeout") || "5"
  );
  const [darkMode]                    = useState(true); // always dark for now
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
      </div>

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
            <div className="sr-label">Dark Mode</div>
            <div className="sr-desc">App is always dark — full dark mode only</div>
          </div>
          <div className="toggle on" style={{opacity:.4,cursor:"not-allowed"}}>
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
      {resetOpen&&(
        <ResetModal onClose={()=>setResetOpen(false)} onReset={()=>{setResetOpen(false);onReset();}}/>
      )}
    </div>
  );
}

// ─── Schedule Upload Modal ────────────────────────────────────────────────────
function ScheduleUploadModal({ weekStartDate, onClose }) {
  const [file,setFile]=useState(null);const [prev,setPrev]=useState(null);
  const [loading,setLoading]=useState(false);const [result,setResult]=useState(null);
  const [err,setErr]=useState(null);const ref=useRef();

  const generate = async () => {
    if(!file){setErr("Upload your schedule photo.");return;}
    setLoading(true);setErr(null);
    try {
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({data:r.result.split(",")[1],type:file.type});r.onerror=rej;r.readAsDataURL(file);});
      const res=await api("/workout/generate-week",{method:"POST",body:JSON.stringify({week_start:weekStartDate,schedule_image:b64,module:"fitness"})});
      setResult(res.reasoning);
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Upload Weekly Schedule</div>
          <div className="ms">Photo or screenshot — AI reads it and generates your plan</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.6}}>
            Each week the plan improves using your accumulated data. Week 1 is a baseline. By week 4 AI knows your patterns.
          </div>
          {prev?<img src={prev} className="upr" alt="schedule"/>:
            <div className="uz" onClick={()=>ref.current?.click()}>
              <div style={{fontSize:24,marginBottom:6}}>📅</div>
              <div style={{fontSize:12,color:"var(--m2)"}}><b style={{color:"var(--t)"}}>Tap to upload</b> your schedule</div>
            </div>}
          <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
            onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPrev(URL.createObjectURL(f));}}}/>
          <Err msg={err}/>
          {result&&(
            <div>
              <AiBox label="AI Reasoning for this week" text={result}/>
              <div style={{fontSize:12,color:"var(--a)",marginTop:8,fontWeight:600}}>
                ✓ Plan saved — check Fitness → Blueprint
              </div>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={generate} disabled={!file||loading}>
            {loading?<><Dots/> Generating…</>:"✦ Generate This Week"}
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
      // Also clear local session
      clearSession();
      onReset();
    }catch(e){setErr(e.message);}
    setLoading(false);
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
          <button className="btn bwarn" onClick={doReset} disabled={!confirmed||loading}>
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
function HobbiesTab() {
  return <ComingSoon icon="🎨" label="Hobbies" desc="Log hobbies, track progress, get AI coaching."
    items={[{icon:"✏️",label:"Daily practice log"},{icon:"🎯",label:"Goal tracking"},{icon:"✨",label:"Weekly insight"}]}/>;
}
function SkillsTab() {
  return <ComingSoon icon="📚" label="Skills" desc="Log learning, track progression, AI guidance."
    items={[{icon:"📝",label:"Learning log"},{icon:"📊",label:"Skill progression"},{icon:"✨",label:"AI suggestions"}]}/>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id:"home",     icon:"🏠", label:"Today",   built:true  },
  { id:"fitness",  icon:"🏋️", label:"Fitness", built:true  },
  { id:"notes",    icon:"📝", label:"Notes",   built:true  },
  { id:"hobbies",  icon:"🎨", label:"Hobbies", built:false },
  { id:"skills",   icon:"📚", label:"Skills",  built:false },
  { id:"settings", icon:"⚙️", label:"Settings",built:true  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed]     = useState(()=>!!localStorage.getItem("lifeos_token")&&!isSessionExpired());
  const [tab, setTab]           = useState("home");
  const [workerOk, setWorkerOk] = useState(null);
  const [streak, setStreak]     = useState({count:0,message:""});
  const [weekPlan, setWeekPlan] = useState(null);

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

  // Lock on close/hide
  useEffect(()=>{
    if(!authed)return;
    const onHide=()=>{if(document.visibilityState==="hidden")clearSession();};
    const onUnload=()=>clearSession();
    document.addEventListener("visibilitychange",onHide);
    window.addEventListener("beforeunload",onUnload);
    return()=>{document.removeEventListener("visibilitychange",onHide);window.removeEventListener("beforeunload",onUnload);};
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

  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)}/>;

  const todayLabel=new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  const TITLES={home:["Today's"," Tasks"],fitness:["Fit","ness"],notes:["My ","Notes"],
    hobbies:["Hob","bies"],skills:["My ","Skills"],settings:["Set","tings"]};

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
            {tab==="home"     && <TodayTab streak={streak} weekPlan={weekPlan}/>}
            {tab==="fitness"  && <FitnessTab/>}
            {tab==="notes"    && <NotesTab/>}
            {tab==="hobbies"  && <HobbiesTab/>}
            {tab==="skills"   && <SkillsTab/>}
            {tab==="settings" && <SettingsTab onReset={()=>setAuthed(false)}/>}
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
