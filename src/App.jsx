import { useState, useEffect, useRef, useCallback } from "react";

// ─── Worker URL ───────────────────────────────────────────────────────────────
const WORKER_URL = "https://lifeos-api.sarpreet5601.workers.dev";

// ─── Auth ─────────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("lifeos_token") || ""; }

// ─── API helper — every request carries the auth token ────────────────────────
async function api(path, options = {}) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || "API error");
  }
  return res.json();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().slice(0, 10);
const weekStart = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07070F;--bg2:#0E0E1C;--bg3:#151528;--bg4:#1C1C34;
  --b:rgba(255,255,255,0.07);--b2:rgba(255,255,255,0.14);
  --a:#5CFFB0;--warn:#FF6B6B;--gold:#FFD166;
  --t:#EEEEFF;--m:#55557A;--m2:#8888AA;
  --font:'Syne',sans-serif;--mono:'DM Mono',monospace;
  --sb:220px;--mob-nav:64px;--mob-header:52px;
}
html,body{height:100%;background:var(--bg);color:var(--t);font-family:var(--font);-webkit-font-smoothing:antialiased;overflow:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:2px}

/* ════════════════════════════════
   APP SHELL
   ════════════════════════════════ */
.app{display:flex;height:100vh;overflow:hidden;position:relative}

/* ════════════════════════════════
   DESKTOP SIDEBAR
   ════════════════════════════════ */
.sb{width:var(--sb);min-width:var(--sb);background:var(--bg2);
  border-right:1px solid var(--b);display:flex;flex-direction:column;
  padding:24px 0 16px;flex-shrink:0}
.logo{padding:0 20px 22px;font-size:20px;font-weight:800;letter-spacing:-0.5px}
.logo em{color:var(--a);font-style:normal}
.ns{font-size:9px;font-weight:700;letter-spacing:2.5px;color:var(--m);
  padding:0 20px 6px;text-transform:uppercase}
.ni{display:flex;align-items:center;gap:10px;padding:10px 20px;font-size:13px;
  font-weight:600;color:var(--m2);cursor:pointer;border-left:2px solid transparent;transition:all .15s}
.ni:hover{color:var(--t);background:rgba(255,255,255,.02)}
.ni.on{color:var(--a);border-left-color:var(--a);background:rgba(92,255,176,.04)}
.ni .sn{margin-left:auto;font-size:9px;font-weight:700;color:var(--m);
  background:var(--bg4);padding:2px 6px;border-radius:4px}
.sb-foot{margin-top:auto;padding:14px 16px;display:flex;flex-direction:column;gap:7px}
.streak-sb{background:var(--bg3);border:1px solid rgba(92,255,176,.15);border-radius:8px;
  padding:8px 12px;display:flex;align-items:center;gap:8px}
.streak-num{font-size:18px;font-weight:800;font-family:var(--mono);color:var(--a);line-height:1}
.streak-lbl{font-size:10px;color:var(--m2)}
.worker-badge{font-size:10px;padding:4px 10px;border-radius:6px;text-align:center;
  background:rgba(255,107,107,.08);color:var(--warn);border:1px solid rgba(255,107,107,.2)}
.worker-badge.ok{background:rgba(92,255,176,.06);color:var(--a);border-color:rgba(92,255,176,.15)}

/* ════════════════════════════════
   MAIN AREA (desktop)
   ════════════════════════════════ */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.mob-header{display:none}
.topbar{padding:18px 22px 0;display:flex;align-items:flex-end;
  justify-content:space-between;flex-shrink:0}
.ptitle{font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1}
.ptitle em{color:var(--a);font-style:normal}
.pdate{font-size:11px;color:var(--m);font-family:var(--mono);padding-bottom:2px}
.subnav{display:flex;gap:2px;padding:10px 22px 0;border-bottom:1px solid var(--b);
  overflow-x:auto;scrollbar-width:none;flex-shrink:0}
.subnav::-webkit-scrollbar{display:none}
.sni{padding:8px 12px;font-size:12px;font-weight:700;color:var(--m);cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;transition:all .15s}
.sni:hover{color:var(--t)}.sni.on{color:var(--a);border-bottom-color:var(--a)}

/* tab-content replaces .cnt — scrollable content area */
.tab-content{flex:1;overflow-y:auto;overflow-x:hidden}
.cnt{padding:18px 22px 40px}

/* ════════════════════════════════
   MOBILE BOTTOM NAV
   ════════════════════════════════ */
.mnav{display:none}

/* ════════════════════════════════
   CARDS & SHARED COMPONENTS
   ════════════════════════════════ */
.card{background:var(--bg2);border:1px solid var(--b);border-radius:11px;padding:14px 16px}
.ctitle{font-size:9px;font-weight:700;letter-spacing:2px;color:var(--m);
  text-transform:uppercase;margin-bottom:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:11px}

.aib{background:var(--bg3);border:1px solid rgba(92,255,176,.18);
  border-radius:10px;padding:12px 14px;margin-top:10px}
.aib-t{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--a);margin-bottom:6px;display:flex;align-items:center;gap:6px}
.aib p{font-size:13px;line-height:1.75;color:var(--m2);white-space:pre-wrap}

/* ════════════════════════════════
   TODAY TAB
   ════════════════════════════════ */
.tgl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--m);margin:15px 0 7px;display:flex;align-items:center;gap:7px}
.tgl:first-child{margin-top:0}
.tgl::after{content:'';flex:1;height:1px;background:var(--b)}
.ti{display:flex;align-items:center;gap:12px;padding:13px 14px;background:var(--bg2);
  border:1px solid var(--b);border-radius:10px;cursor:pointer;transition:all .18s;margin-bottom:8px}
.ti:hover{border-color:var(--b2);transform:translateX(2px)}.ti.done{opacity:.45;pointer-events:none}
.tic{font-size:18px;width:36px;height:36px;background:var(--bg3);border-radius:8px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tinfo{flex:1;min-width:0}
.tlbl{font-size:13px;font-weight:700}
.tdsc{font-size:11px;color:var(--m2);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tbdg{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;flex-shrink:0}
.tbdg.p{background:rgba(255,255,255,.05);color:var(--m)}
.tbdg.d{background:rgba(92,255,176,.12);color:var(--a)}
.streak-banner{display:flex;align-items:center;gap:12px;padding:12px 15px;
  background:linear-gradient(135deg,rgba(92,255,176,.07),rgba(92,158,255,.04));
  border:1px solid rgba(92,255,176,.18);border-radius:10px;margin-bottom:16px}
.streak-count{font-size:28px;font-weight:800;font-family:var(--mono);color:var(--a);line-height:1}
.streak-msg{font-size:12px;color:var(--m2);flex:1;line-height:1.5}

/* ════════════════════════════════
   BLUEPRINT / WORKOUT
   ════════════════════════════════ */
.bpr{display:flex;align-items:center;padding:10px 13px;background:var(--bg2);
  border:1px solid var(--b);border-radius:10px;cursor:pointer;transition:all .15s;margin-bottom:7px}
.bpr:hover{border-color:var(--b2)}.bpr.today{border-color:rgba(92,255,176,.3);background:rgba(92,255,176,.03)}
.bpr.rest{opacity:.5;cursor:default}
.bpday{font-size:12px;font-weight:700;width:30px;color:var(--m2);flex-shrink:0}
.bpctx{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:9px;
  flex-shrink:0;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cw{background:rgba(92,158,255,.12);color:#7ABAFF}
.cc{background:rgba(180,100,255,.12);color:#CC88FF}
.cb{background:rgba(255,107,107,.12);color:#FF8A8A}
.co{background:rgba(92,255,176,.12);color:var(--a)}
.cr{background:rgba(255,255,255,.05);color:var(--m)}
.bptyp{font-size:12px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bpwin{font-size:10px;color:var(--m);font-family:var(--mono);flex-shrink:0;margin-left:8px;white-space:nowrap}
.tdot{width:5px;height:5px;border-radius:50%;background:var(--a);margin-right:6px;flex-shrink:0}
.bp-note{font-size:12px;color:var(--m2);background:var(--bg3);border-radius:7px;
  padding:8px 11px;margin-top:8px;font-style:italic;line-height:1.55}
.week-reasoning{background:var(--bg3);border:1px solid rgba(92,158,255,.15);
  border-radius:9px;padding:11px 13px;margin-top:10px;font-size:12px;color:var(--m2);line-height:1.7}
.reasoning-lbl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:#7ABAFF;margin-bottom:5px}
.ex-section{margin-bottom:10px}
.ex-section-title{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--m);margin-bottom:5px}
.exr{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg3);border-radius:7px;margin-bottom:4px}
.exn{flex:1;font-size:12px;font-weight:500}
.exrp{font-size:11px;color:var(--a);font-family:var(--mono)}

/* ════════════════════════════════
   GOALS
   ════════════════════════════════ */
.goal-input-wrap{display:flex;gap:7px;margin-bottom:14px}
.goal-input{flex:1;background:var(--bg2);border:1px solid var(--b);border-radius:8px;
  padding:10px 12px;color:var(--t);font-family:var(--font);font-size:13px;
  outline:none;transition:border-color .15s}
.goal-input:focus{border-color:rgba(92,255,176,.4)}.goal-input::placeholder{color:var(--m)}
.goal-card{background:var(--bg2);border:1px solid var(--b);border-radius:10px;padding:12px 14px;margin-bottom:8px}
.goal-card.done{opacity:.45}
.goal-text{font-size:13px;font-weight:700;display:flex;align-items:flex-start;
  justify-content:space-between;gap:8px;margin-bottom:3px}
.goal-date{font-size:10px;color:var(--m);font-family:var(--mono);margin-bottom:7px}
.goal-ai{font-size:12px;color:var(--m2);line-height:1.65;background:var(--bg3);
  padding:9px 11px;border-radius:7px;white-space:pre-wrap}
.gc-btn{background:none;border:none;cursor:pointer;color:var(--m);
  font-size:13px;padding:1px 3px;transition:color .15s;flex-shrink:0}
.gc-btn:hover{color:var(--warn)}

/* ════════════════════════════════
   NOTES
   ════════════════════════════════ */
.note-card{background:var(--bg2);border:1px solid var(--b);border-radius:10px;padding:12px 14px;margin-bottom:8px}
.note-meta{font-size:10px;color:var(--m);font-family:var(--mono);margin-bottom:5px}
.note-body{font-size:13px;line-height:1.65;color:var(--t);white-space:pre-wrap}

/* ════════════════════════════════
   INPUTS
   ════════════════════════════════ */
.ta{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:9px;
  padding:11px 13px;color:var(--t);font-family:var(--font);font-size:13px;
  line-height:1.6;resize:vertical;outline:none;transition:border-color .15s}
.ta:focus{border-color:rgba(92,255,176,.4)}.ta::placeholder{color:var(--m)}
.inp{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:8px;
  padding:10px 12px;color:var(--t);font-family:var(--font);font-size:13px;
  outline:none;transition:border-color .15s}
.inp:focus{border-color:rgba(92,255,176,.4)}.inp::placeholder{color:var(--m)}

/* ════════════════════════════════
   MODALS
   ════════════════════════════════ */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.9);display:flex;
  align-items:center;justify-content:center;z-index:200;padding:16px;animation:fi .15s}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:var(--bg2);border:1px solid var(--b);border-radius:14px;
  width:100%;max-width:500px;max-height:90vh;overflow-y:auto;animation:su .2s ease}
@keyframes su{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
.mh{padding:15px 18px 13px;border-bottom:1px solid var(--b);
  display:flex;align-items:flex-start;justify-content:space-between}
.mt{font-size:15px;font-weight:800}
.ms{font-size:11px;color:var(--m2);margin-top:2px;font-family:var(--mono)}
.mcl{background:var(--bg4);border:none;color:var(--m);width:28px;height:28px;
  border-radius:6px;cursor:pointer;font-size:16px;display:flex;
  align-items:center;justify-content:center;flex-shrink:0;line-height:1}
.mb{padding:14px 18px}
.mf{padding:10px 18px 14px;border-top:1px solid var(--b);display:flex;gap:8px}

/* ════════════════════════════════
   UPLOAD ZONES
   ════════════════════════════════ */
.uz{border:2px dashed var(--b);border-radius:10px;padding:22px 18px;
  text-align:center;cursor:pointer;transition:all .15s;margin-bottom:9px}
.uz:hover{border-color:var(--a);background:rgba(92,255,176,.02)}
.upr{width:100%;max-height:150px;object-fit:contain;border-radius:8px;margin-bottom:8px;border:1px solid var(--b)}
.upload-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.upload-half{border:1px dashed var(--b);border-radius:9px;padding:14px 10px;
  text-align:center;cursor:pointer;transition:all .15s;min-height:90px;
  display:flex;flex-direction:column;align-items:center;justify-content:center}
.upload-half:hover{border-color:var(--a)}
.upload-half.has{border-color:rgba(92,255,176,.4);background:rgba(92,255,176,.03)}
.upload-half img{width:100%;max-height:80px;object-fit:contain;border-radius:6px;margin-bottom:4px}
.upload-half-lbl{font-size:11px;color:var(--m2)}

/* ════════════════════════════════
   BUTTONS
   ════════════════════════════════ */
.btn{padding:10px 15px;border-radius:8px;font-family:var(--font);font-size:13px;
  font-weight:700;cursor:pointer;border:none;transition:all .15s;
  display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
.bp{background:var(--a);color:#05050E;flex:1}
.bp:hover{background:#7BFFC4}.bp:disabled{opacity:.5;cursor:not-allowed}
.bs{background:var(--bg3);color:var(--t);border:1px solid var(--b);flex:1}
.bs:hover{border-color:var(--b2)}
.bsm{flex:none;padding:8px 13px;font-size:12px}

/* ════════════════════════════════
   MISC
   ════════════════════════════════ */
.dots{display:inline-flex;gap:3px}
.dots span{width:5px;height:5px;border-radius:50%;background:var(--a);animation:bop 1.1s infinite}
.dots span:nth-child(2){animation-delay:.18s}.dots span:nth-child(3){animation-delay:.36s}
@keyframes bop{0%,80%,100%{transform:scale(0.6)}40%{transform:scale(1)}}
.err-banner{padding:8px 12px;background:rgba(255,107,107,.08);
  border:1px solid rgba(255,107,107,.2);border-radius:8px;
  font-size:12px;color:var(--warn);margin-bottom:10px}
.cs-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:300px;text-align:center;gap:8px;padding:20px}
.cs-list{margin-top:11px;display:flex;flex-direction:column;gap:5px;width:100%;max-width:270px}
.cs-item{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);
  border:1px solid var(--b);border-radius:8px;font-size:12px;color:var(--m2)}
.cs-tag{margin-left:auto;font-size:9px;font-weight:700;color:var(--m);background:var(--bg3);padding:2px 6px;border-radius:4px}
.cs-badge{margin-top:14px;padding:7px 16px;background:rgba(92,255,176,.06);
  border:1px solid rgba(92,255,176,.15);border-radius:7px;font-size:12px;color:var(--a);font-weight:600}

/* ════════════════════════════════
   MOBILE  ≤ 768px
   Full redesign — not just adjustments
   ════════════════════════════════ */
@media(max-width:768px){
  html,body{overflow:hidden;height:100%;height:100dvh}

  /* Hide desktop elements */
  .sb{display:none}
  .topbar{display:none}

  /* App is a full-height flex column */
  .app{flex-direction:column;height:100vh;height:100dvh}

  /* Mobile header — fixed top bar */
  .mob-header{
    display:flex;align-items:center;
    padding:0 16px;
    height:var(--mob-header);
    min-height:var(--mob-header);
    background:var(--bg2);
    border-bottom:1px solid var(--b);
    flex-shrink:0;
    gap:10px;
  }
  .mob-logo{font-size:18px;font-weight:800;letter-spacing:-0.5px;flex:1}
  .mob-logo em{color:var(--a);font-style:normal}
  .mob-date{font-size:11px;color:var(--m);font-family:var(--mono)}
  .mob-streak{display:flex;align-items:center;gap:4px;font-size:13px;font-weight:800;
    color:var(--a);font-family:var(--mono);background:rgba(92,255,176,.08);
    border:1px solid rgba(92,255,176,.15);border-radius:20px;padding:3px 9px}

  /* Main fills remaining space */
  .main{
    flex:1;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    min-height:0;
  }

  /* Scrollable content */
  .tab-content{
    flex:1;
    overflow-y:auto;
    overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
  }

  /* Content padding — bottom clears the nav bar */
  .cnt{padding:14px 14px calc(var(--mob-nav) + 20px) 14px}

  /* Subnav for fitness tabs */
  .subnav{padding:0 14px;background:var(--bg2);border-bottom:1px solid var(--b)}
  .sni{padding:10px 10px;font-size:11px}

  /* Bottom nav */
  .mnav{
    display:flex;
    position:fixed;
    bottom:0;left:0;right:0;
    height:var(--mob-nav);
    background:var(--bg2);
    border-top:1px solid var(--b);
    z-index:100;
    padding-bottom:env(safe-area-inset-bottom,0px);
  }
  .mni{
    flex:1;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    padding:6px 2px 4px;
    cursor:pointer;gap:3px;
    position:relative;
  }
  .mni-ico{font-size:22px;line-height:1;transition:transform .15s}
  .mni.on .mni-ico{transform:scale(1.15)}
  .mni-lbl{
    font-size:9px;font-weight:700;color:var(--m);
    text-transform:uppercase;letter-spacing:.5px;
    white-space:nowrap;line-height:1
  }
  .mni.on .mni-lbl{color:var(--a)}
  .mni-dot{position:absolute;top:5px;right:20%;width:5px;height:5px;
    border-radius:50%;background:var(--warn)}

  /* Stack 2-col grids */
  .g2{grid-template-columns:1fr}

  /* Upload pair: side by side still fine at 320+ */
  .upload-pair{grid-template-columns:1fr 1fr;gap:8px}

  /* Task items — bigger tap targets */
  .ti{padding:14px 12px;border-radius:12px}
  .tic{width:40px;height:40px;font-size:19px;border-radius:10px}
  .tlbl{font-size:14px}
  .tdsc{font-size:12px}

  /* Streak banner */
  .streak-banner{padding:11px 13px;gap:10px;border-radius:12px}
  .streak-count{font-size:26px}
  .streak-msg{font-size:11px}

  /* Blueprint rows */
  .bpr{padding:12px 12px;border-radius:10px}
  .bpday{font-size:13px;width:32px}
  .bpctx{font-size:8px;padding:2px 5px;max-width:65px}
  .bptyp{font-size:13px}
  .bpwin{display:none}

  /* Goals */
  .goal-input-wrap{flex-direction:column}
  .goal-input-wrap .bsm{width:100%;text-align:center}

  /* Notes textarea */
  .ta{min-height:80px}

  /* Modals — sheet from bottom */
  .ov{padding:0;align-items:flex-end}
  .modal{
    max-width:100%;width:100%;
    border-radius:20px 20px 0 0;
    max-height:88vh;
  }
  .mh{padding:16px 16px 12px}
  .mb{padding:12px 16px}
  .mf{padding:10px 16px 16px;flex-direction:column}
  .mf .bs,.mf .bp{flex:none;width:100%}

  /* Buttons in rows */
  .btn{padding:11px 14px;font-size:14px;border-radius:10px}

  /* AI box */
  .aib{border-radius:10px;padding:12px 13px}
  .aib p{font-size:12px}
}

/* Very small phones */
@media(max-width:360px){
  .mni-ico{font-size:19px}
  .mni-lbl{font-size:8px}
  .cnt{padding:12px 12px calc(var(--mob-nav) + 18px) 12px}
  .upload-pair{grid-template-columns:1fr}
}
`;
// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setError("Wrong password — try again."); setLoading(false); return; }
      localStorage.setItem("lifeos_token", data.token);
      onLogin();
    } catch { setError("Could not reach server. Check connection."); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#07070F",flexDirection:"column",gap:14,padding:24,
      fontFamily:"'Syne',sans-serif",
    }}>
      <style>{CSS}</style>
      <div style={{
        width:"100%",maxWidth:340,background:"#0E0E1C",
        border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:16,padding:"32px 24px",display:"flex",
        flexDirection:"column",gap:14,
      }}>
        <div style={{textAlign:"center",marginBottom:4}}>
          <div style={{fontSize:32,fontWeight:800,letterSpacing:-1,color:"#EEEEFF",lineHeight:1}}>
            Life<span style={{color:"#5CFFB0"}}>OS</span>
          </div>
          <div style={{fontSize:12,color:"#55557A",marginTop:6}}>Personal Life Dashboard</div>
        </div>

        <div style={{height:1,background:"rgba(255,255,255,0.07)"}}/>

        <div style={{fontSize:12,color:"#8888AA",textAlign:"center"}}>
          Enter your password to continue
        </div>

        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && login()}
          autoFocus
          style={{
            width:"100%",padding:"12px 14px",
            background:"#151528",border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:9,color:"#EEEEFF",fontFamily:"inherit",
            fontSize:14,outline:"none",
          }}
        />

        {error && (
          <div style={{
            fontSize:12,color:"#FF6B6B",textAlign:"center",
            background:"rgba(255,107,107,.08)",padding:"7px 12px",
            borderRadius:7,border:"1px solid rgba(255,107,107,.2)"
          }}>
            {error}
          </div>
        )}

        <button
          onClick={login}
          disabled={loading || !pw.trim()}
          style={{
            width:"100%",padding:"12px 14px",
            background: loading || !pw.trim() ? "#2a4a3a" : "#5CFFB0",
            border:"none",borderRadius:9,
            color: loading || !pw.trim() ? "#4a8a6a" : "#05050E",
            fontFamily:"inherit",fontSize:14,fontWeight:700,
            cursor: loading || !pw.trim() ? "not-allowed" : "pointer",
            transition:"all .2s",
          }}
        >
          {loading ? "Checking…" : "Unlock →"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function Dots() { return <div className="dots"><span/><span/><span/></div>; }
function Err({ msg }) {
  if (!msg) return null;
  return <div className="err-banner">⚠ {msg}</div>;
}
function AiBox({ label, text, tag }) {
  if (!text) return null;
  return (
    <div className="aib">
      <div className="aib-t">✦ {label}{tag && <span style={{fontSize:9,padding:"2px 7px",background:"rgba(92,255,176,.08)",borderRadius:4,color:"var(--a)"}}>{tag}</span>}</div>
      <p>{text}</p>
    </div>
  );
}
function ComingSoon({ icon, label, desc, items = [] }) {
  return (
    <div className="cs-wrap">
      <div style={{fontSize:40,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:17,fontWeight:800,letterSpacing:-0.5}}>{label}</div>
      <div style={{fontSize:12,color:"var(--m2)",maxWidth:290,lineHeight:1.65}}>{desc}</div>
      {items.length > 0 && (
        <div className="cs-list">
          {items.map((x, i) => (
            <div key={i} className="cs-item">
              <span>{x.icon}</span><span style={{flex:1}}>{x.label}</span>
              <span className="cs-tag">SOON</span>
            </div>
          ))}
        </div>
      )}
      <div className="cs-badge">Coming soon — Fitness is live 🏋️</div>
    </div>
  );
}
function UploadZone({ label, file, setFile, preview, setPreview }) {
  const ref = useRef();
  const pick = f => { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); };
  return (
    <div className={"upload-half"+(preview?" has":"")} onClick={() => ref.current?.click()}>
      {preview ? <img src={preview} alt={label}/> : <div style={{fontSize:22,marginBottom:4}}>📸</div>}
      <div className="upload-half-lbl">{preview ? "✓ "+label : label}</div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
        onChange={e => pick(e.target.files[0])}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TODAY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TodayTab({ streak, weekPlan }) {
  const today = todayStr();
  const [dayData, setDayData]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api(`/data/day/${today}`); setDayData(d); }
    catch { setDayData(null); }
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const bpIdx    = (() => { const d = new Date().getDay(); return d===0?6:d-1; })();
  const todayPlan = weekPlan?.fitness?.days?.[bpIdx] || null;

  const tasks = [
    { id:"daily",   icon:"🌙", label:"Upload Sleep + Activity",
      desc:"Both Samsung Health screenshots together", done:!!dayData?.combined_analysis },
    { id:"workout", icon:"🏋️",
      label: todayPlan?.session_name || "Today's Workout",
      desc:  todayPlan ? `${todayPlan.time_window} · AI-generated` : "Upload schedule first",
      done:  !!dayData?.workout_completed },
  ];

  const pending  = tasks.filter(t => !t.done).length;
  const rc       = dayData?.recovery_score;
  const rcColor  = rc >= 80 ? "var(--a)" : rc >= 55 ? "var(--gold)" : "var(--warn)";

  if (loading) return (
    <div className="cnt" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}>
      <Dots/>
    </div>
  );

  return (
    <div className="cnt">
      {streak?.count > 0 && (
        <div className="streak-banner">
          <span style={{fontSize:22}}>🔥</span>
          <div>
            <div className="streak-count">{streak.count}</div>
            <div style={{fontSize:10,color:"var(--m2)"}}>day streak</div>
          </div>
          {streak.message && <div className="streak-msg">{streak.message}</div>}
        </div>
      )}

      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontSize:10,color:"var(--m)",fontFamily:"var(--mono)"}}>TODAY</div>
          <div style={{fontSize:14,fontWeight:700,marginTop:2}}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </div>
        </div>
        {rc
          ? <div style={{textAlign:"right"}}>
              <div style={{fontSize:28,fontWeight:800,fontFamily:"var(--mono)",color:rcColor,lineHeight:1}}>{rc}</div>
              <div style={{fontSize:10,color:rcColor,marginTop:1}}>RECOVERY</div>
            </div>
          : <div style={{fontSize:11,padding:"3px 10px",borderRadius:6,
              color:pending>0?"var(--warn)":"var(--a)",
              background:pending>0?"rgba(255,107,107,.08)":"rgba(92,255,176,.08)",
              border:"1px solid "+(pending>0?"rgba(255,107,107,.2)":"rgba(92,255,176,.2)")}}>
              {pending} pending
            </div>
        }
      </div>

      <div className="tgl">🏋️ Fitness</div>
      {tasks.map(task => (
        <div key={task.id} className={"ti"+(task.done?" done":"")}
          onClick={() => {
            if (task.done) return;
            if (task.id === "daily")   setUploadOpen(true);
            if (task.id === "workout") setWorkoutOpen(true);
          }}>
          <div className="tic">{task.icon}</div>
          <div className="tinfo">
            <div className="tlbl">{task.label}</div>
            <div className="tdsc">{task.desc}</div>
          </div>
          <span className={"tbdg "+(task.done?"d":"p")}>{task.done?"Done ✓":"Pending"}</span>
          {!task.done && <span style={{color:"var(--m)",fontSize:14,marginLeft:4}}>›</span>}
        </div>
      ))}

      {dayData?.combined_analysis && (
        <AiBox label="Day Observation" text={dayData.combined_analysis} tag={today}/>
      )}

      {uploadOpen && (
        <DailyUploadModal today={today} todayPlan={todayPlan}
          onClose={() => { setUploadOpen(false); load(); }}/>
      )}
      {workoutOpen && (
        <WorkoutModal today={today} todayPlan={todayPlan} dayData={dayData}
          onClose={() => { setWorkoutOpen(false); load(); }}/>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY UPLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DailyUploadModal({ today, todayPlan, onClose }) {
  const [sleepFile, setSleepFile] = useState(null);
  const [sleepPrev, setSleepPrev] = useState(null);
  const [actFile, setActFile]     = useState(null);
  const [actPrev, setActPrev]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [err, setErr]             = useState(null);

  const analyze = async () => {
    if (!sleepFile || !actFile) { setErr("Upload both screenshots first."); return; }
    setLoading(true); setErr(null);
    try {
      const toB64 = f => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res({ data: r.result.split(",")[1], type: f.type });
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const [s, a] = await Promise.all([toB64(sleepFile), toB64(actFile)]);
      const res = await api("/analyze/day", {
        method: "POST",
        body: JSON.stringify({
          date: today,
          sleep_image: s,
          activity_image: a,
          yesterday_schedule: todayPlan ? JSON.stringify(todayPlan) : "Schedule not uploaded yet",
        }),
      });
      setResult(res.analysis);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Upload Sleep + Activity</div>
          <div className="ms">Both analyzed together in one AI call</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.55}}>
            Upload both screenshots. AI analyzes them simultaneously with your schedule context and writes a permanent day observation.
          </div>
          <div className="upload-pair">
            <UploadZone label="Sleep" file={sleepFile} setFile={setSleepFile} preview={sleepPrev} setPreview={setSleepPrev}/>
            <UploadZone label="Activity" file={actFile} setFile={setActFile} preview={actPrev} setPreview={setActPrev}/>
          </div>
          <Err msg={err}/>
          {result && <AiBox label="Day Observation — saved" text={result}/>}
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={analyze} disabled={!sleepFile||!actFile||loading}>
            {loading ? <><Dots/> Analyzing…</> : "✦ Analyze Together"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function WorkoutModal({ today, todayPlan, dayData, onClose }) {
  const [note, setNote]           = useState(dayData?.workout_note || "");
  const [noteResult, setNoteResult] = useState(dayData?.note_analysis || null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted]   = useState(!!dayData?.workout_completed);
  const [err, setErr]               = useState(null);

  const parseWorkout = text => {
    if (!text) return [];
    const sections = [];
    let cur = null;
    text.split("\n").map(l => l.trim()).filter(Boolean).forEach(l => {
      if (l.match(/^(WARM.?UP|MAIN WORK|COOL.?DOWN|COACH NOTE)/i)) {
        cur = { title: l, items: [] }; sections.push(cur);
      } else if (l.startsWith("-") && cur) cur.items.push(l.slice(1).trim());
      else if (cur) cur.items.push(l);
    });
    return sections;
  };

  const sections = parseWorkout(todayPlan?.session_detail || "");

  const handleComplete = async () => {
    setCompleting(true); setErr(null);
    try {
      const res = await api("/workout/complete", {
        method: "POST",
        body: JSON.stringify({ date: today, note: note.trim() }),
      });
      setNoteResult(res.note_analysis);
      setCompleted(true);
    } catch(e) { setErr(e.message); }
    setCompleting(false);
  };

  return (
    <div className="ov" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div>
            <div className="mt">{todayPlan?.session_name || "Today's Workout"}</div>
            <div className="ms">
              {todayPlan ? `${todayPlan.time_window} · ${todayPlan.context}` : "No plan generated yet"}
            </div>
          </div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          {!todayPlan && (
            <div style={{textAlign:"center",padding:"24px 0",color:"var(--m)",fontSize:13}}>
              Upload your weekly schedule first — AI will generate this week's workouts from it.
            </div>
          )}

          {sections.map((sec, i) => (
            <div key={i} className="ex-section">
              <div className="ex-section-title">{sec.title}</div>
              {sec.items.map((item, j) => (
                <div key={j} className="exr">
                  <span className="exn">{item.split("—")[0].trim()}</span>
                  {item.includes("x") && <span className="exrp">{item.match(/\d+\s*x\s*\d+/)?.[0]}</span>}
                </div>
              ))}
            </div>
          ))}

          {!completed && todayPlan && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--m)",
                letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>
                How did that feel?
              </div>
              <div style={{fontSize:11,color:"var(--m2)",marginBottom:7,lineHeight:1.5}}>
                This note is stored with today's data — AI reads it when planning next week.
              </div>
              <input className="inp" placeholder="Felt strong, struggled, ran out of time…"
                value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleComplete()}/>
            </div>
          )}

          {noteResult && <AiBox label="Post-Workout Insight — saved" text={noteResult}/>}
          <Err msg={err}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          {!completed && todayPlan && (
            <button className="btn bp" onClick={handleComplete} disabled={completing}>
              {completing ? <><Dots/> Saving…</> : "✅ Mark Complete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FITNESS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function FitnessTab() {
  const [sec, setSec]               = useState("blueprint");
  const [weekPlan, setWeekPlan]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [schedOpen, setSchedOpen]   = useState(false);
  const [compOpen, setCompOpen]     = useState(false);
  const [compResult, setCompResult] = useState(null);
  const [review, setReview]         = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [monthReport, setMonthReport]     = useState(null);
  const [monthLoading, setMonthLoading]   = useState(false);

  const ws = weekStart(todayStr());

  const load = useCallback(async () => {
    try { const p = await api(`/data/week/${ws}`); setWeekPlan(p); }
    catch { setWeekPlan(null); }
    setLoading(false);
  }, [ws]);

  useEffect(() => { load(); }, [load]);

  const bpIdx   = (() => { const d = new Date().getDay(); return d===0?6:d-1; })();
  const days    = weekPlan?.fitness?.days || [];
  const todayDay = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][bpIdx];
  const ctxCls  = c => c?.includes("Work")&&c?.includes("College")?"cb":c==="Work"?"cw":c==="College"?"cc":c==="Off"?"co":"cr";

  const generateReview = async () => {
    setReviewLoading(true);
    try { const r = await api("/analyze/weekly-review",{method:"POST",body:JSON.stringify({week_start:ws})}); setReview(r.review); }
    catch(e) { alert(e.message); }
    setReviewLoading(false);
  };

  const generateMonthly = async () => {
    setMonthLoading(true);
    try { const r = await api("/analyze/monthly-report",{method:"POST",body:JSON.stringify({month:new Date().toISOString().slice(0,7)})}); setMonthReport(r.report); }
    catch(e) { alert(e.message); }
    setMonthLoading(false);
  };

  const SECS = [{id:"blueprint",l:"Blueprint"},{id:"review",l:"Weekly Review"},{id:"monthly",l:"Monthly"},{id:"goals",l:"Goals"}];

  return (
    <>
      <div className="subnav">
        {SECS.map(s => <div key={s.id} className={"sni"+(sec===s.id?" on":"")} onClick={() => setSec(s.id)}>{s.l}</div>)}
      </div>
      <div className="cnt">

        {sec === "blueprint" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:10,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>This Week's Plan</div>
                <div style={{fontSize:11,color:"var(--m)",marginTop:1}}>
                  {weekPlan?.fitness ? `Week ${weekPlan.fitness.week_number || 1}` : "No plan yet — upload your schedule"}
                </div>
              </div>
              <button className="btn bs bsm" onClick={() => setSchedOpen(true)}>📅 Upload Schedule</button>
            </div>

            {loading && <div style={{textAlign:"center",padding:"30px",color:"var(--m)"}}><Dots/></div>}

            {!loading && !weekPlan?.fitness && (
              <div style={{textAlign:"center",padding:"28px 0",color:"var(--m)",fontSize:13,lineHeight:1.8}}>
                <div style={{fontSize:28,marginBottom:8}}>📅</div>
                Upload your schedule and AI will generate this week's workout plan.<br/>
                <span style={{fontSize:11}}>Week 1 = baseline. Each week improves from your accumulated data.</span>
              </div>
            )}

            {weekPlan?.fitness?.reasoning && (
              <div className="week-reasoning">
                <div className="reasoning-lbl">✦ AI Reasoning for this week</div>
                {weekPlan.fitness.reasoning}
              </div>
            )}

            {days.map((day, i) => (
              <div key={i} className={"bpr"+(day.is_rest?" rest":"")+(day.day===todayDay?" today":"")}>
                {day.day === todayDay && <div className="tdot"/>}
                <div className="bpday">{day.day}</div>
                <div className={"bpctx "+ctxCls(day.context)}>{day.context || "—"}</div>
                <div className="bptyp">{day.session_name || (day.is_rest?"Rest Day":"—")}</div>
                <div className="bpwin">{day.time_window}</div>
                {!day.is_rest && <span style={{color:"var(--m)",fontSize:13,marginLeft:4}}>›</span>}
              </div>
            ))}

            {weekPlan?.fitness?.days?.[bpIdx]?.ai_note && (
              <div className="bp-note">Today: "{weekPlan.fitness.days[bpIdx].ai_note}"</div>
            )}
          </div>
        )}

        {sec === "review" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>Weekly Review</div>
                <div style={{fontSize:11,color:"var(--m)",marginTop:1}}>AI reads all 7 days of stored observations</div>
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                <button className="btn bs bsm" onClick={() => setCompOpen(true)}>📐 Body Comp</button>
                <button className="btn bp bsm" onClick={generateReview} disabled={reviewLoading}>
                  {reviewLoading ? <><Dots/></> : "✦ Generate"}
                </button>
              </div>
            </div>
            {compResult && <AiBox label="Body Composition Analysis" text={compResult}/>}
            {review
              ? <AiBox label="AI Weekly Review" text={review}/>
              : !reviewLoading && (
                <div style={{textAlign:"center",padding:"28px 0",color:"var(--m)",fontSize:13,lineHeight:1.8}}>
                  <div style={{fontSize:28,marginBottom:8}}>📊</div>
                  AI reads all your day observations, workout notes, and body comp from this week.
                </div>
              )
            }
          </div>
        )}

        {sec === "monthly" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>Monthly Report</div>
                <div style={{fontSize:11,color:"var(--m)",marginTop:1}}>AI reads 30 days of observations</div>
              </div>
              <button className="btn bp bsm" onClick={generateMonthly} disabled={monthLoading}>
                {monthLoading ? <><Dots/></> : "✦ Generate"}
              </button>
            </div>
            {monthReport
              ? <AiBox label="AI Monthly Report" text={monthReport}/>
              : !monthLoading && (
                <div style={{textAlign:"center",padding:"28px 0",color:"var(--m)",fontSize:13,lineHeight:1.8}}>
                  <div style={{fontSize:28,marginBottom:8}}>📅</div>
                  AI reads 30 days of sleep, activity, workouts, notes, and body comp.
                  <div style={{marginTop:6,fontSize:11}}>Best after 2+ weeks of data.</div>
                </div>
              )
            }
          </div>
        )}

        {sec === "goals" && <GoalsSection/>}
      </div>

      {schedOpen && (
        <ScheduleUploadModal weekStartDate={ws}
          onClose={() => { setSchedOpen(false); load(); }}/>
      )}
      {compOpen && (
        <BodyCompModal weekStartDate={ws}
          onClose={() => setCompOpen(false)}
          onDone={r => { setCompResult(r); setCompOpen(false); }}/>
      )}
    </>
  );
}

// ─── Schedule Upload ──────────────────────────────────────────────────────────
function ScheduleUploadModal({ weekStartDate, onClose }) {
  const [file, setFile]     = useState(null);
  const [prev, setPrev]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr]       = useState(null);
  const ref = useRef();

  const generate = async () => {
    if (!file) { setErr("Upload your schedule photo first."); return; }
    setLoading(true); setErr(null);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res({ data: r.result.split(",")[1], type: file.type });
        r.onerror = rej; r.readAsDataURL(file);
      });
      const res = await api("/workout/generate-week", {
        method: "POST",
        body: JSON.stringify({ week_start: weekStartDate, schedule_image: b64, module: "fitness" }),
      });
      setResult(res.reasoning);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Upload Weekly Schedule</div>
          <div className="ms">Photo or screenshot of your schedule</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.55}}>
            AI reads your schedule and generates this week's workout plan. Each week the plan improves using your accumulated data.
          </div>
          {prev
            ? <img src={prev} className="upr" alt="schedule"/>
            : <div className="uz" onClick={() => ref.current?.click()}>
                <div style={{fontSize:24,marginBottom:6}}>📅</div>
                <div style={{fontSize:13,color:"var(--m2)"}}>
                  <b style={{color:"var(--t)"}}>Tap to upload</b> your schedule
                </div>
              </div>
          }
          <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
            onChange={e => { const f=e.target.files[0]; if(f){setFile(f);setPrev(URL.createObjectURL(f));} }}/>
          <Err msg={err}/>
          {result && (
            <div>
              <AiBox label="AI Reasoning for this week's plan" text={result}/>
              <div style={{fontSize:12,color:"var(--a)",marginTop:8}}>✓ Workout plan saved — check Blueprint tab</div>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={generate} disabled={!file||loading}>
            {loading ? <><Dots/> Generating…</> : "✦ Generate This Week"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Body Comp Upload ─────────────────────────────────────────────────────────
function BodyCompModal({ weekStartDate, onClose, onDone }) {
  const [file, setFile]     = useState(null);
  const [prev, setPrev]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState(null);
  const ref = useRef();

  const analyze = async () => {
    if (!file) { setErr("Upload body comp screenshot."); return; }
    setLoading(true); setErr(null);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res({ data: r.result.split(",")[1], type: file.type });
        r.onerror = rej; r.readAsDataURL(file);
      });
      const res = await api("/analyze/body-comp", {
        method: "POST",
        body: JSON.stringify({ week_start: weekStartDate, image: b64 }),
      });
      onDone(res.analysis);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Upload Body Composition</div>
          <div className="ms">Samsung Health body comp screenshot</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.55}}>
            AI receives this screenshot plus all 7 day observations from this week, your notes context, and previous body comp history.
          </div>
          {prev
            ? <img src={prev} className="upr" alt="body comp"/>
            : <div className="uz" onClick={() => ref.current?.click()}>
                <div style={{fontSize:24,marginBottom:6}}>📐</div>
                <div style={{fontSize:13,color:"var(--m2)"}}>
                  <b style={{color:"var(--t)"}}>Tap to upload</b>
                </div>
              </div>
          }
          <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
            onChange={e => { const f=e.target.files[0]; if(f){setFile(f);setPrev(URL.createObjectURL(f));} }}/>
          <Err msg={err}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={analyze} disabled={!file||loading}>
            {loading ? <><Dots/> Analyzing…</> : "✦ Analyze with Full Context"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function GoalsSection() {
  const [goals, setGoals]   = useState([]);
  const [input, setInput]   = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/goals?module=fitness").then(d => { setGoals(d.goals||[]); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const addGoal = async () => {
    if (!input.trim()) return;
    setAdding(true);
    const opt = { id:Date.now(), text:input.trim(), ai_insight:null, done:false, created_at:new Date().toISOString() };
    setGoals(g => [opt,...g]); setInput("");
    try {
      const res = await api("/goals", { method:"POST", body:JSON.stringify({text:opt.text,module:"fitness"}) });
      setGoals(g => g.map(x => x.id===opt.id ? {...x,id:res.id,ai_insight:res.ai_insight} : x));
    } catch(e) {
      setGoals(g => g.map(x => x.id===opt.id ? {...x,ai_insight:"Could not analyze — check Worker connection."} : x));
    }
    setAdding(false);
  };

  const toggleDone = async (id, done) => {
    setGoals(g => g.map(x => x.id===id ? {...x,done:!done} : x));
    await api(`/goals/${id}`, {method:"PATCH",body:JSON.stringify({done:!done})}).catch(()=>{});
  };
  const deleteGoal = async (id) => {
    setGoals(g => g.filter(x => x.id!==id));
    await api(`/goals/${id}`, {method:"DELETE"}).catch(()=>{});
  };

  if (loading) return <div style={{textAlign:"center",padding:"30px",color:"var(--m)"}}><Dots/></div>;

  return (
    <div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700}}>Fitness Goals</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:2}}>
          Type any goal — AI assesses it immediately using your current data
        </div>
      </div>

      <div className="goal-input-wrap">
        <input className="goal-input"
          placeholder="e.g. Do 15 pull-ups by July · Reach 18% body fat"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && addGoal()}
          disabled={adding}
        />
        <button className="btn bp bsm" onClick={addGoal} disabled={adding||!input.trim()}>
          {adding ? <Dots/> : "Add"}
        </button>
      </div>

      {goals.length===0 && (
        <div style={{textAlign:"center",padding:"24px 0",color:"var(--m)",fontSize:12}}>
          No goals yet. Add your first one above.
        </div>
      )}

      {goals.map(g => (
        <div key={g.id} className={"goal-card"+(g.done?" done":"")}>
          <div className="goal-text">
            <span style={{textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <button className="gc-btn" onClick={() => toggleDone(g.id,g.done)}>{g.done?"↩":"✓"}</button>
              <button className="gc-btn" onClick={() => deleteGoal(g.id)}>✕</button>
            </div>
          </div>
          <div className="goal-date">
            {new Date(g.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
          </div>
          {g.ai_insight===null
            ? <div style={{fontSize:11,color:"var(--m)",display:"flex",alignItems:"center",gap:5}}><Dots/> AI analyzing…</div>
            : <div className="goal-ai">{g.ai_insight}</div>
          }
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function NotesTab() {
  const [notes, setNotes]         = useState([]);
  const [context, setContext]     = useState(null);
  const [input, setInput]         = useState("");
  const [adding, setAdding]       = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api("/notes").catch(() => ({notes:[]})),
      api("/notes/context").catch(() => ({context:null})),
    ]).then(([n,c]) => { setNotes(n.notes||[]); setContext(c.context||null); setLoading(false); });
  }, []);

  const addNote = async () => {
    if (!input.trim()) return;
    setAdding(true);
    try {
      const res = await api("/notes",{method:"POST",body:JSON.stringify({content:input.trim()})});
      setNotes(n => [res.note,...n]); setInput("");
    } catch{}
    setAdding(false);
  };

  const processNotes = async () => {
    setProcessing(true);
    try { const res = await api("/notes/process",{method:"POST"}); setContext(res.context); }
    catch(e) { alert(e.message); }
    setProcessing(false);
  };

  const deleteNote = async (id) => {
    setNotes(n => n.filter(x => x.id!==id));
    await api(`/notes/${id}`,{method:"DELETE"}).catch(()=>{});
  };

  if (loading) return <div className="cnt" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:200}}><Dots/></div>;

  return (
    <div className="cnt">
      <div style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700}}>Personal Notes</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:2,lineHeight:1.55}}>
          Add anything about your life — commute times, preferences, constraints, injuries. AI reads all of this when planning your schedule.
        </div>
      </div>

      {context && (
        <div className="card" style={{marginBottom:14,borderColor:"rgba(92,255,176,.2)"}}>
          <div className="ctitle" style={{color:"var(--a)"}}>✦ Active AI Context — injected into every call</div>
          <div style={{fontSize:12,color:"var(--m2)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{context}</div>
        </div>
      )}

      <textarea className="ta" style={{minHeight:90,marginBottom:8}}
        placeholder={"Add anything that affects your planning:\n• College commute = 45 min, Work = 20 min\n• I hate working out before 7am\n• Bad left shoulder — no overhead pressing"}
        value={input} onChange={e => setInput(e.target.value)}
      />
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <button className="btn bs" onClick={processNotes} disabled={processing||notes.length===0} style={{flex:"1 1 200px"}}>
          {processing ? <><Dots/> Processing…</> : "✦ Process All → Update AI Context"}
        </button>
        <button className="btn bp bsm" onClick={addNote} disabled={adding||!input.trim()}>
          {adding ? <Dots/> : "Add Note"}
        </button>
      </div>

      {notes.length===0 && (
        <div style={{textAlign:"center",padding:"20px 0",color:"var(--m)",fontSize:12}}>
          No notes yet. Add anything about your schedule and lifestyle.
        </div>
      )}

      {notes.map(n => (
        <div key={n.id} className="note-card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div className="note-meta">
              {new Date(n.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
            </div>
            <button className="gc-btn" onClick={() => deleteNote(n.id)}>✕</button>
          </div>
          <div className="note-body">{n.content}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER TABS
// ═══════════════════════════════════════════════════════════════════════════════
function HobbiesTab() {
  return <ComingSoon icon="🎨" label="Hobbies" desc="Log hobbies, track progress, get AI coaching."
    items={[{icon:"✏️",label:"Daily log → AI analysis"},{icon:"🎯",label:"Goal cards"},{icon:"✨",label:"Weekly insight"}]}/>;
}
function SkillsTab() {
  return <ComingSoon icon="📚" label="Skills" desc="Log learning, track progression, get AI guidance."
    items={[{icon:"📝",label:"Learning log"},{icon:"📊",label:"Skill progression"},{icon:"✨",label:"AI suggestions"}]}/>;
}
function LifeGoalsTab() {
  return <ComingSoon icon="🎯" label="Life Goals" desc="5-year vision, 1-year goals, 4-month sprint — AI aligned."
    items={[{icon:"🌅",label:"5-Year vision"},{icon:"🎯",label:"1-Year goals"},{icon:"📅",label:"4-Month sprint"}]}/>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id:"home",    icon:"🏠", label:"Today",   built:true  },
  { id:"fitness", icon:"🏋️", label:"Fitness", built:true  },
  { id:"notes",   icon:"📝", label:"Notes",   built:true  },
  { id:"hobbies", icon:"🎨", label:"Hobbies", built:false },
  { id:"skills",  icon:"📚", label:"Skills",  built:false },
  { id:"goals",   icon:"🎯", label:"Goals",   built:false },
];

export default function App() {
  // ALL hooks must be called before any conditional return — React rule
  const [authed, setAuthed]     = useState(!!localStorage.getItem("lifeos_token"));
  const [tab, setTab]           = useState("home");
  const [workerOk, setWorkerOk] = useState(null);
  const [streak, setStreak]     = useState({ count:0, message:"" });
  const [weekPlan, setWeekPlan] = useState(null);

  useEffect(() => {
    if (!authed) return;
    fetch(`${WORKER_URL}/health`).then(r => setWorkerOk(r.ok)).catch(() => setWorkerOk(false));
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    api("/data/streak").then(d => setStreak(d)).catch(() => {});
    const ws = weekStart(todayStr());
    api(`/data/week/${ws}`).then(d => setWeekPlan(d)).catch(() => {});
  }, [authed]);

  // Show login AFTER all hooks are declared
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const TITLES = {
    home:    ["Today's"," Tasks"],
    fitness: ["Fit","ness"],
    notes:   ["My ","Notes"],
    hobbies: ["Hob","bies"],
    skills:  ["My ","Skills"],
    goals:   ["Life ","Goals"],
  };

  const todayLabel = new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* ── Desktop sidebar ── */}
        <div className="sb">
          <div className="logo">Life<em>OS</em></div>
          <div className="ns">Modules</div>
          {NAV.map(n => (
            <div key={n.id} className={"ni"+(tab===n.id?" on":"")} onClick={() => setTab(n.id)}>
              <span>{n.icon}</span><span>{n.label}</span>
              {!n.built && <span className="sn">SOON</span>}
            </div>
          ))}
          <div className="sb-foot">
            {streak.count > 0 && (
              <div className="streak-sb">
                <span>🔥</span>
                <div>
                  <div className="streak-num">{streak.count}</div>
                  <div className="streak-lbl">day streak</div>
                </div>
              </div>
            )}
            <div className={"worker-badge"+(workerOk?" ok":"")}>
              {workerOk===null ? "Checking…" : workerOk ? "✦ Worker Connected" : "⚠ Worker not connected"}
            </div>
          </div>
        </div>

        {/* ── Main content area ── */}
        <div className="main">

          {/* Mobile-only header */}
          <div className="mob-header">
            <div className="mob-logo">Life<em>OS</em></div>
            <div className="mob-date">{todayLabel}</div>
            {streak.count > 0 && (
              <div className="mob-streak"><span>🔥</span>{streak.count}</div>
            )}
          </div>

          {/* Desktop topbar */}
          <div className="topbar">
            <div className="ptitle">{TITLES[tab][0]}<em>{TITLES[tab][1]}</em></div>
            <div className="pdate">{todayLabel}</div>
          </div>

          <div className="tab-content">
            {tab==="home"    && <TodayTab streak={streak} weekPlan={weekPlan}/>}
            {tab==="fitness" && <FitnessTab/>}
            {tab==="notes"   && <NotesTab/>}
            {tab==="hobbies" && <HobbiesTab/>}
            {tab==="skills"  && <SkillsTab/>}
            {tab==="goals"   && <LifeGoalsTab/>}
          </div>
        </div>

        {/* ── Mobile bottom nav ── */}
        <nav className="mnav">
          {NAV.map(n => (
            <div key={n.id} className={"mni"+(tab===n.id?" on":"")} onClick={() => setTab(n.id)}>
              <div className="mni-ico">{n.icon}</div>
              <div className="mni-lbl">{n.label}</div>
              {!n.built && <div className="mni-dot"/>}
            </div>
          ))}
        </nav>

      </div>
    </>
  );
}
