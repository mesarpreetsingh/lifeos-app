import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// CLOUDFLARE WORKER API
// Every single piece of data goes through here — no localStorage, no local state
// that persists. The Worker holds the Gemini key as a secret and calls D1 for storage.
//
// TO USE: Replace WORKER_URL with your deployed Worker URL after setup.
// See worker.js and SETUP.md for deployment instructions.
// ═══════════════════════════════════════════════════════════════════════════════
const WORKER_URL = "https://lifeos-api.sarpreet5601.workers.dev";

async function api(path, options = {}) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API error");
  }
  return res.json();
}

// Upload a file (screenshot) to the Worker which stores it in R2
async function uploadFile(path, file, extraBody = {}) {
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(extraBody).forEach(([k, v]) => fd.append(k, typeof v === "string" ? v : JSON.stringify(v)));
  const res = await fetch(`${WORKER_URL}${path}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().slice(0, 10);
const weekStart = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
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
}
html,body{height:100%;overflow:hidden}
body{background:var(--bg);color:var(--t);font-family:var(--font);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:2px}
.app{display:flex;height:100vh}

.sb{width:226px;min-width:226px;background:var(--bg2);border-right:1px solid var(--b);display:flex;flex-direction:column;padding:24px 0 16px}
.logo{padding:0 20px 24px;font-size:20px;font-weight:800;letter-spacing:-0.5px}
.logo em{color:var(--a);font-style:normal}
.ns{font-size:9px;font-weight:700;letter-spacing:2.5px;color:var(--m);padding:0 20px 5px;text-transform:uppercase;margin-top:4px}
.ni{display:flex;align-items:center;gap:10px;padding:10px 20px;font-size:13px;font-weight:600;color:var(--m2);cursor:pointer;border-left:2px solid transparent;transition:all .15s}
.ni:hover{color:var(--t);background:rgba(255,255,255,.02)}
.ni.on{color:var(--a);border-left-color:var(--a);background:rgba(92,255,176,.04)}
.ni .dot{width:5px;height:5px;border-radius:50%;background:var(--warn);margin-left:auto;animation:pulse 2s infinite}
.ni .sn{margin-left:auto;font-size:9px;font-weight:700;color:var(--m);background:var(--bg4);padding:2px 6px;border-radius:4px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.sb-foot{margin-top:auto;padding:14px 18px;display:flex;flex-direction:column;gap:7px}
.streak-sb{background:var(--bg3);border:1px solid rgba(92,255,176,.15);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px}
.streak-num{font-size:18px;font-weight:800;font-family:var(--mono);color:var(--a);line-height:1}
.streak-lbl{font-size:10px;color:var(--m2)}
.kb{width:100%;padding:8px 12px;background:var(--bg3);border:1px solid var(--b);color:var(--m2);font-family:var(--font);font-size:12px;font-weight:600;border-radius:8px;cursor:pointer;transition:all .15s;text-align:center}
.kb:hover{border-color:var(--a);color:var(--a)}.kb.set{color:var(--a);border-color:rgba(92,255,176,.25)}
.worker-badge{font-size:10px;padding:4px 10px;border-radius:6px;text-align:center;background:rgba(255,107,107,.08);color:var(--warn);border:1px solid rgba(255,107,107,.2)}
.worker-badge.ok{background:rgba(92,255,176,.06);color:var(--a);border-color:rgba(92,255,176,.15)}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{padding:20px 26px 0;display:flex;align-items:flex-end;justify-content:space-between}
.ptitle{font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1}
.ptitle em{color:var(--a);font-style:normal}
.pdate{font-size:11px;color:var(--m);font-family:var(--mono);padding-bottom:2px}
.subnav{display:flex;gap:2px;padding:12px 26px 0;border-bottom:1px solid var(--b);overflow-x:auto;scrollbar-width:none}
.subnav::-webkit-scrollbar{display:none}
.sni{padding:8px 14px;font-size:12px;font-weight:700;color:var(--m);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;transition:all .15s}
.sni:hover{color:var(--t)}.sni.on{color:var(--a);border-bottom-color:var(--a)}
.cnt{flex:1;overflow-y:auto;padding:20px 26px 80px}

.card{background:var(--bg2);border:1px solid var(--b);border-radius:11px;padding:14px 16px}
.ctitle{font-size:9px;font-weight:700;letter-spacing:2px;color:var(--m);text-transform:uppercase;margin-bottom:10px}
.gap{margin-top:13px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.mr{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b)}.mr:last-child{border:none}
.mn{font-size:12px;color:var(--m2)}.mv{font-size:12px;font-weight:700;font-family:var(--mono)}

.aib{background:var(--bg3);border:1px solid rgba(92,255,176,.18);border-radius:10px;padding:12px 14px;margin-top:10px}
.aib-t{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--a);margin-bottom:6px;display:flex;align-items:center;gap:6px}
.aib p{font-size:12px;line-height:1.7;color:var(--m2);white-space:pre-wrap}
.obs-tag{font-size:9px;padding:2px 7px;background:rgba(92,255,176,.08);border-radius:4px;color:var(--a)}

.tgl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--m);margin:15px 0 7px;display:flex;align-items:center;gap:7px}
.tgl:first-child{margin-top:0}.tgl::after{content:'';flex:1;height:1px;background:var(--b)}
.ti{display:flex;align-items:center;gap:11px;padding:12px 14px;background:var(--bg2);border:1px solid var(--b);border-radius:10px;cursor:pointer;transition:all .18s;margin-bottom:7px}
.ti:hover{border-color:var(--b2);transform:translateX(2px)}.ti.done{opacity:.45;pointer-events:none}
.tic{font-size:17px;width:34px;height:34px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tinfo{flex:1;min-width:0}.tlbl{font-size:13px;font-weight:700}
.tdsc{font-size:11px;color:var(--m2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tbdg{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;flex-shrink:0}
.tbdg.p{background:rgba(255,255,255,.05);color:var(--m)}.tbdg.d{background:rgba(92,255,176,.12);color:var(--a)}

.streak-banner{display:flex;align-items:center;gap:12px;padding:12px 15px;background:linear-gradient(135deg,rgba(92,255,176,.07),rgba(92,158,255,.04));border:1px solid rgba(92,255,176,.18);border-radius:10px;margin-bottom:16px}
.streak-count{font-size:28px;font-weight:800;font-family:var(--mono);color:var(--a);line-height:1}
.streak-msg{font-size:12px;color:var(--m2);flex:1;line-height:1.5}

.bpr{display:flex;align-items:center;padding:10px 13px;background:var(--bg2);border:1px solid var(--b);border-radius:10px;cursor:pointer;transition:all .15s;margin-bottom:7px}
.bpr:hover{border-color:var(--b2)}.bpr.today{border-color:rgba(92,255,176,.3);background:rgba(92,255,176,.03)}.bpr.rest{opacity:.5;cursor:default}
.bpday{font-size:12px;font-weight:700;width:30px;color:var(--m2)}
.bpctx{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:9px;flex-shrink:0;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cw{background:rgba(92,158,255,.12);color:#7ABAFF}.cc{background:rgba(180,100,255,.12);color:#CC88FF}
.cb{background:rgba(255,107,107,.12);color:#FF8A8A}.co{background:rgba(92,255,176,.12);color:var(--a)}.cr{background:rgba(255,255,255,.05);color:var(--m)}
.bptyp{font-size:12px;font-weight:600;flex:1}.bpwin{font-size:10px;color:var(--m);font-family:var(--mono);width:100px;flex-shrink:0}
.tdot{width:5px;height:5px;border-radius:50%;background:var(--a);margin-right:6px;flex-shrink:0}
.bp-note{font-size:11px;color:var(--m2);background:var(--bg3);border-radius:7px;padding:7px 10px;margin-top:8px;font-style:italic}

.ex-section{margin-bottom:10px}
.ex-section-title{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--m);margin-bottom:5px}
.exr{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg3);border-radius:7px;margin-bottom:4px}
.exn{flex:1;font-size:12px;font-weight:500}.exrp{font-size:11px;color:var(--a);font-family:var(--mono)}

.goal-input-wrap{display:flex;gap:7px;margin-bottom:14px}
.goal-input{flex:1;background:var(--bg2);border:1px solid var(--b);border-radius:8px;padding:10px 12px;color:var(--t);font-family:var(--font);font-size:13px;outline:none;transition:border-color .15s}
.goal-input:focus{border-color:rgba(92,255,176,.4)}.goal-input::placeholder{color:var(--m)}
.goal-card{background:var(--bg2);border:1px solid var(--b);border-radius:10px;padding:12px 14px;margin-bottom:8px}
.goal-card.done{opacity:.45}
.goal-text{font-size:13px;font-weight:700;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px}
.goal-date{font-size:10px;color:var(--m);font-family:var(--mono);margin-bottom:7px}
.goal-ai{font-size:12px;color:var(--m2);line-height:1.65;background:var(--bg3);padding:9px 11px;border-radius:7px;white-space:pre-wrap}
.gc-btn{background:none;border:none;cursor:pointer;color:var(--m);font-size:13px;padding:1px 3px;transition:color .15s;flex-shrink:0}
.gc-btn:hover{color:var(--warn)}

.note-card{background:var(--bg2);border:1px solid var(--b);border-radius:10px;padding:12px 14px;margin-bottom:8px}
.note-meta{font-size:10px;color:var(--m);font-family:var(--mono);margin-bottom:5px}
.note-body{font-size:13px;line-height:1.6;color:var(--t);white-space:pre-wrap}
.note-ctx{font-size:12px;color:var(--m2);background:var(--bg3);padding:8px 10px;border-radius:7px;margin-top:8px;font-style:italic;white-space:pre-wrap}

.ta{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:9px;padding:11px 13px;color:var(--t);font-family:var(--font);font-size:13px;line-height:1.6;resize:vertical;outline:none;transition:border-color .15s}
.ta:focus{border-color:rgba(92,255,176,.4)}.ta::placeholder{color:var(--m)}
.inp{width:100%;background:var(--bg2);border:1px solid var(--b);border-radius:8px;padding:9px 12px;color:var(--t);font-family:var(--font);font-size:13px;outline:none;transition:border-color .15s}
.inp:focus{border-color:rgba(92,255,176,.4)}.inp::placeholder{color:var(--m)}
.ainp{width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--b);color:var(--t);font-family:var(--mono);font-size:13px;border-radius:8px;outline:none;transition:border-color .15s;margin-bottom:8px}
.ainp:focus{border-color:var(--a)}.anote{font-size:12px;color:var(--m);line-height:1.65;margin-bottom:11px}.anote a{color:var(--a);text-decoration:none}

.ov{position:fixed;inset:0;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px;animation:fi .15s}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:var(--bg2);border:1px solid var(--b);border-radius:15px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;animation:su .2s ease}
@keyframes su{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
.mh{padding:15px 19px 13px;border-bottom:1px solid var(--b);display:flex;align-items:flex-start;justify-content:space-between}
.mt{font-size:16px;font-weight:800}.ms{font-size:11px;color:var(--m2);margin-top:2px;font-family:var(--mono)}
.mcl{background:var(--bg4);border:none;color:var(--m);width:25px;height:25px;border-radius:6px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mb{padding:15px 19px}
.mf{padding:10px 19px 15px;border-top:1px solid var(--b);display:flex;gap:8px}

.uz{border:2px dashed var(--b);border-radius:10px;padding:22px 18px;text-align:center;cursor:pointer;transition:all .15s;margin-bottom:9px}
.uz:hover{border-color:var(--a);background:rgba(92,255,176,.02)}
.upr{width:100%;max-height:150px;object-fit:contain;border-radius:8px;margin-bottom:8px;border:1px solid var(--b)}
.upload-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.upload-half{border:1px dashed var(--b);border-radius:9px;padding:14px 10px;text-align:center;cursor:pointer;transition:all .15s}
.upload-half:hover{border-color:var(--a)}.upload-half.has{border-color:rgba(92,255,176,.4);background:rgba(92,255,176,.03)}
.upload-half img{width:100%;max-height:90px;object-fit:contain;border-radius:6px;margin-bottom:4px}
.upload-half-lbl{font-size:11px;color:var(--m2)}

.btn{padding:9px 15px;border-radius:8px;font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px}
.bp{background:var(--a);color:#05050E;flex:1}.bp:hover{background:#7BFFC4}.bp:disabled{opacity:.5;cursor:not-allowed}
.bs{background:var(--bg3);color:var(--t);border:1px solid var(--b);flex:1}.bs:hover{border-color:var(--b2)}
.bsm{flex:none;padding:6px 12px;font-size:11px}
.btn-ghost{background:none;border:none;cursor:pointer;color:var(--m);font-size:12px;padding:2px 4px;transition:color .15s}.btn-ghost:hover{color:var(--warn)}

.dots{display:inline-flex;gap:3px}.dots span{width:5px;height:5px;border-radius:50%;background:var(--a);animation:bop 1.1s infinite}
.dots span:nth-child(2){animation-delay:.18s}.dots span:nth-child(3){animation-delay:.36s}
@keyframes bop{0%,80%,100%{transform:scale(0.6)}40%{transform:scale(1)}}

.week-reasoning{background:var(--bg3);border:1px solid rgba(92,158,255,.15);border-radius:9px;padding:11px 13px;margin-top:10px;font-size:12px;color:var(--m2);line-height:1.65;white-space:pre-wrap}
.reasoning-lbl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7ABAFF;margin-bottom:5px}

.cs-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:340px;text-align:center;gap:8px;padding:0 20px}
.cs-list{margin-top:11px;display:flex;flex-direction:column;gap:5px;width:100%;max-width:270px}
.cs-item{display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--bg2);border:1px solid var(--b);border-radius:8px;font-size:12px;color:var(--m2)}
.cs-tag{margin-left:auto;font-size:9px;font-weight:700;color:var(--m);background:var(--bg3);padding:2px 6px;border-radius:4px}
.cs-badge{margin-top:14px;padding:6px 16px;background:rgba(92,255,176,.06);border:1px solid rgba(92,255,176,.15);border-radius:7px;font-size:12px;color:var(--a);font-weight:600}

.mnav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--bg2);border-top:1px solid var(--b);z-index:100;padding-bottom:env(safe-area-inset-bottom)}
.mnav-items{display:flex}
.mni{flex:1;display:flex;flex-direction:column;align-items:center;padding:8px 3px 6px;cursor:pointer;gap:2px}
.mni-ico{font-size:19px;line-height:1}.mni-lbl{font-size:9px;font-weight:700;color:var(--m);text-transform:uppercase;letter-spacing:.5px}
.mni.on .mni-lbl{color:var(--a)}
.err-banner{padding:8px 12px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.2);border-radius:8px;font-size:12px;color:var(--warn);margin-bottom:10px}

@media(max-width:768px){
  .sb{display:none}.mnav{display:block}.cnt{padding:15px 15px 86px}
  .topbar{padding:15px 15px 0}.subnav{padding:10px 15px 0}
  .g2{grid-template-columns:1fr}.ptitle{font-size:20px}.bpwin{display:none}
  .upload-pair{grid-template-columns:1fr}
}
@media(max-width:480px){.sni{padding:7px 10px;font-size:11px}}
`;

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
      <div className="aib-t">
        ✦ {label}
        {tag && <span className="obs-tag">{tag}</span>}
      </div>
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

// ─── Upload zone (single image) ───────────────────────────────────────────────
function UploadZone({ label, file, setFile, preview, setPreview }) {
  const ref = useRef();
  const pick = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  return (
    <div className={"upload-half"+(preview?" has":"")} onClick={() => ref.current?.click()}>
      {preview
        ? <img src={preview} alt={label}/>
        : <div style={{fontSize:22,marginBottom:4}}>📸</div>
      }
      <div className="upload-half-lbl">{preview ? "✓ "+label : label}</div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
        onChange={e => pick(e.target.files[0])}/>
    </div>
  );
}

// ─── Config modal (Worker URL) ────────────────────────────────────────────────
function ConfigModal({ onClose, onSave, current }) {
  const [url, setUrl] = useState(current || "");
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Cloudflare Worker URL</div><div className="ms">Your personal API backend</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <p className="anote">
            Deploy the worker.js file to Cloudflare Workers and paste the URL here.<br/>
            The Worker holds your Gemini key securely — it never touches this browser.<br/>
            See SETUP.md for full instructions.
          </p>
          <input className="ainp" placeholder="https://lifeos-api.YOUR_SUBDOMAIN.workers.dev"
            value={url} onChange={e => setUrl(e.target.value)}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={() => { onSave(url); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TODAY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TodayTab({ workerUrl, streak, weekPlan }) {
  const today = todayStr();
  const [dayData, setDayData]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const load = useCallback(async () => {
    if (!workerUrl) { setLoading(false); return; }
    try {
      const d = await api(`/data/day/${today}`);
      setDayData(d);
    } catch { setDayData(null); }
    setLoading(false);
  }, [workerUrl, today]);

  useEffect(() => { load(); }, [load]);

  const bpIdx = (() => { const d = new Date().getDay(); return d===0?6:d-1; })();
  const todayPlan = weekPlan?.days?.[bpIdx] || null;

  const tasks = [
    {
      id: "daily",
      icon: "🌙",
      label: "Upload Sleep + Activity",
      desc: "Both Samsung Health screenshots together",
      done: !!dayData?.combined_analysis,
    },
    {
      id: "workout",
      icon: "🏋️",
      label: todayPlan ? todayPlan.workout_name || "Today's Workout" : "Today's Workout",
      desc: todayPlan ? `${todayPlan.time_window} · AI-generated` : "Upload schedule to generate",
      done: !!dayData?.workout_completed,
    },
  ];

  const pending = tasks.filter(t => !t.done).length;
  const rcColor = (s) => s >= 80 ? "var(--a)" : s >= 55 ? "var(--gold)" : "var(--warn)";

  if (loading) return <div className="cnt" style={{display:"flex",alignItems:"center",justifyContent:"center",color:"var(--m)"}}><Dots/></div>;

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
          <div style={{fontSize:13,fontWeight:700,marginTop:1}}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </div>
        </div>
        {dayData?.recovery_score
          ? <div style={{textAlign:"right"}}>
              <div style={{fontSize:26,fontWeight:800,fontFamily:"var(--mono)",color:rcColor(dayData.recovery_score),lineHeight:1}}>{dayData.recovery_score}</div>
              <div style={{fontSize:10,color:rcColor(dayData.recovery_score)}}>RECOVERY</div>
            </div>
          : <div style={{fontSize:11,padding:"3px 10px",borderRadius:6,color:pending>0?"var(--warn)":"var(--a)",background:pending>0?"rgba(255,107,107,.08)":"rgba(92,255,176,.08)",border:"1px solid "+(pending>0?"rgba(255,107,107,.2)":"rgba(92,255,176,.2)")}}>
              {pending} pending
            </div>
        }
      </div>

      <div className="tgl">🏋️ Fitness</div>
      {tasks.map(task => (
        <div key={task.id}
          className={"ti"+(task.done?" done":"")}
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
          {!task.done && <span style={{color:"var(--m)",fontSize:14}}>›</span>}
        </div>
      ))}

      {dayData?.combined_analysis && (
        <AiBox label="Day Observation" text={dayData.combined_analysis} tag={today}/>
      )}

      {uploadOpen && (
        <DailyUploadModal
          workerUrl={workerUrl}
          today={today}
          todayPlan={todayPlan}
          onClose={() => { setUploadOpen(false); load(); }}
        />
      )}
      {workoutOpen && (
        <WorkoutModal
          workerUrl={workerUrl}
          today={today}
          todayPlan={todayPlan}
          dayData={dayData}
          onClose={() => { setWorkoutOpen(false); load(); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY UPLOAD MODAL — sleep + activity together, one AI call
// ═══════════════════════════════════════════════════════════════════════════════
function DailyUploadModal({ workerUrl, today, todayPlan, onClose }) {
  const [sleepFile, setSleepFile]     = useState(null);
  const [sleepPrev, setSleepPrev]     = useState(null);
  const [actFile, setActFile]         = useState(null);
  const [actPrev, setActPrev]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [err, setErr]                 = useState(null);

  const canAnalyze = sleepFile && actFile;

  const analyze = async () => {
    if (!workerUrl) { setErr("Set your Worker URL in settings."); return; }
    setLoading(true); setErr(null);
    try {
      // Convert both files to base64 and send together
      const toB64 = (f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res({ data: r.result.split(",")[1], type: f.type });
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const [sleepB64, actB64] = await Promise.all([toB64(sleepFile), toB64(actFile)]);

      const res = await api("/analyze/day", {
        method: "POST",
        body: JSON.stringify({
          date: today,
          sleep_image: sleepB64,
          activity_image: actB64,
          // Pass the full schedule text for yesterday so AI understands the full context
          yesterday_schedule: todayPlan
            ? `Today's plan: ${JSON.stringify(todayPlan)}`
            : "Schedule not yet uploaded",
        }),
      });
      setResult(res.analysis);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div>
            <div className="mt">Upload Sleep + Activity</div>
            <div className="ms">Both analyzed together in one AI call</div>
          </div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.5}}>
            Upload both screenshots. AI will analyze them simultaneously with yesterday's schedule, your workout completion, and notes — then write a single day observation stored permanently for next week's planning.
          </div>
          <div className="upload-pair">
            <UploadZone label="Sleep" file={sleepFile} setFile={setSleepFile} preview={sleepPrev} setPreview={setSleepPrev}/>
            <UploadZone label="Activity" file={actFile} setFile={setActFile} preview={actPrev} setPreview={setActPrev}/>
          </div>
          <Err msg={err}/>
          {result && <AiBox label="Day Observation — saved to your history" text={result}/>}
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={analyze} disabled={!canAnalyze || loading}>
            {loading ? <><Dots/> Analyzing both…</> : "✦ Analyze Together"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT MODAL — shows AI-generated workout from weekly plan, post-workout note
// ═══════════════════════════════════════════════════════════════════════════════
function WorkoutModal({ workerUrl, today, todayPlan, dayData, onClose }) {
  const [note, setNote]         = useState(dayData?.workout_note || "");
  const [noteResult, setNoteResult] = useState(dayData?.note_analysis || null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted]   = useState(!!dayData?.workout_completed);
  const [err, setErr]               = useState(null);

  // Parse workout text from the weekly plan into sections for display
  const parseWorkout = (text) => {
    if (!text) return [];
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const sections = [];
    let cur = null;
    lines.forEach(l => {
      const isSection = l.match(/^(WARM.?UP|MAIN WORK|COOL.?DOWN|COACH NOTE)/i);
      if (isSection) { cur = { title: l, items: [] }; sections.push(cur); }
      else if (l.startsWith("-") && cur) cur.items.push(l.slice(1).trim());
      else if (cur) cur.items.push(l);
    });
    return sections;
  };

  const workoutText = todayPlan?.workout_detail || "";
  const sections    = parseWorkout(workoutText);

  const handleComplete = async () => {
    if (!workerUrl) return;
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
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div>
            <div className="mt">{todayPlan?.workout_name || "Today's Workout"}</div>
            <div className="ms">
              {todayPlan?.time_window} · {todayPlan?.context}
              {todayPlan?.ai_note && " · "+todayPlan.ai_note}
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
              {sec.items.map((item, j) => {
                const m = item.match(/^(.+?)(?:\s*[:-]\s*(.+?))?(?:\s*[—-]\s*(.+))?$/);
                return (
                  <div key={j} className="exr">
                    <span className="exn">{m?.[1] || item}</span>
                    {m?.[2] && <span className="exrp">{m[2]}</span>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Post-workout note — stored attached to today, fed into next week's planning */}
          {!completed && todayPlan && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--m)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>
                How did that feel?
              </div>
              <div style={{fontSize:11,color:"var(--m2)",marginBottom:7,lineHeight:1.5}}>
                This note is stored with today's data. Next week, AI reads it to understand how you feel on {todayPlan?.context} days.
              </div>
              <input className="inp" placeholder="Felt strong, struggled with the last set, ran out of time…"
                value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleComplete()}
              />
            </div>
          )}

          {noteResult && <AiBox label="Insight — also saved to your history" text={noteResult}/>}
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
function FitnessTab({ workerUrl }) {
  const [sec, setSec]             = useState("blueprint");
  const [weekPlan, setWeekPlan]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [schedOpen, setSchedOpen] = useState(false);
  const [compOpen, setCompOpen]   = useState(false);
  const [compResult, setCompResult] = useState(null);
  const [review, setReview]       = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [monthReport, setMonthReport]     = useState(null);
  const [monthLoading, setMonthLoading]   = useState(false);

  const ws = weekStart(todayStr());

  const load = useCallback(async () => {
    if (!workerUrl) { setLoading(false); return; }
    try {
      const p = await api(`/data/week/${ws}`);
      setWeekPlan(p);
    } catch { setWeekPlan(null); }
    setLoading(false);
  }, [workerUrl, ws]);

  useEffect(() => { load(); }, [load]);

  const generateReview = async () => {
    if (!workerUrl) return;
    setReviewLoading(true);
    try {
      const r = await api("/analyze/weekly-review", { method: "POST", body: JSON.stringify({ week_start: ws }) });
      setReview(r.review);
    } catch(e) { alert(e.message); }
    setReviewLoading(false);
  };

  const generateMonthly = async () => {
    if (!workerUrl) return;
    setMonthLoading(true);
    try {
      const r = await api("/analyze/monthly-report", { method: "POST", body: JSON.stringify({ month: new Date().toISOString().slice(0,7) }) });
      setMonthReport(r.report);
    } catch(e) { alert(e.message); }
    setMonthLoading(false);
  };

  const bpIdx = (() => { const d = new Date().getDay(); return d===0?6:d-1; })();
  const days  = weekPlan?.days || [];
  const todayDay = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][bpIdx];
  const ctxCls = c => c?.includes("Work")&&c?.includes("College")?"cb":c==="Work"?"cw":c==="College"?"cc":c==="Off"?"co":"cr";

  const SECS = [{id:"blueprint",l:"Blueprint"},{id:"review",l:"Weekly Review"},{id:"monthly",l:"Monthly"},{id:"goals",l:"Goals"}];

  return (
    <>
      <div className="subnav">
        {SECS.map(s => <div key={s.id} className={"sni"+(sec===s.id?" on":"")} onClick={() => setSec(s.id)}>{s.l}</div>)}
      </div>
      <div className="cnt">

        {sec === "blueprint" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>This Week's Plan</div>
                <div style={{fontSize:11,color:"var(--m)",marginTop:1}}>
                  {weekPlan ? `Generated ${weekPlan.generated_at || ws} · Week ${weekPlan.week_number || "1"}` : "No plan yet — upload your schedule"}
                </div>
              </div>
              <button className="btn bs bsm" onClick={() => setSchedOpen(true)}>📅 Upload Schedule</button>
            </div>

            {loading && <div style={{textAlign:"center",padding:"30px",color:"var(--m)"}}><Dots/></div>}

            {!loading && !weekPlan && (
              <div style={{textAlign:"center",padding:"30px 0",color:"var(--m)",fontSize:13,lineHeight:1.7}}>
                <div style={{fontSize:28,marginBottom:8}}>📅</div>
                Upload your schedule and AI will generate this week's workout plan.<br/>
                <span style={{fontSize:11}}>Week 1 = basic plan. Each week improves using your accumulated data.</span>
              </div>
            )}

            {weekPlan?.reasoning && (
              <div className="week-reasoning">
                <div className="reasoning-lbl">✦ AI Reasoning for this week's plan</div>
                {weekPlan.reasoning}
              </div>
            )}

            {days.map((day, i) => (
              <div key={i} className={"bpr"+(day.is_rest?" rest":"")+(day.day===todayDay?" today":"")}>
                {day.day === todayDay && <div className="tdot"/>}
                <div className="bpday">{day.day}</div>
                <div className={"bpctx "+ctxCls(day.context)}>{day.context}</div>
                <div className="bpwin">{day.time_window}</div>
                <div className="bptyp">{day.workout_name || (day.is_rest ? "Rest" : "—")}</div>
                {!day.is_rest && <span style={{color:"var(--m)",fontSize:13}}>›</span>}
              </div>
            ))}

            {weekPlan?.days?.[bpIdx]?.ai_note && (
              <div className="bp-note">Today: "{weekPlan.days[bpIdx].ai_note}"</div>
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
              <div style={{display:"flex",gap:7}}>
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
                <div style={{textAlign:"center",padding:"30px 0",color:"var(--m)",fontSize:13,lineHeight:1.7}}>
                  <div style={{fontSize:28,marginBottom:8}}>📊</div>
                  AI will read all your day observations, workout notes, and body comp data from this week and write a comprehensive review.
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
                <div style={{textAlign:"center",padding:"30px 0",color:"var(--m)",fontSize:13,lineHeight:1.7}}>
                  <div style={{fontSize:28,marginBottom:8}}>📅</div>
                  AI reads 30 days of accumulated data — sleep trends, workout adherence, body comp arc, note patterns — and generates your full monthly picture.
                  <div style={{marginTop:8,fontSize:11}}>Best after 2+ weeks of data.</div>
                </div>
              )
            }
          </div>
        )}

        {sec === "goals" && <GoalsSection workerUrl={workerUrl}/>}
      </div>

      {schedOpen && (
        <ScheduleUploadModal
          workerUrl={workerUrl}
          weekStart={ws}
          onClose={() => { setSchedOpen(false); load(); }}
        />
      )}

      {compOpen && (
        <BodyCompModal
          workerUrl={workerUrl}
          weekStart={ws}
          onClose={() => setCompOpen(false)}
          onDone={r => { setCompResult(r); setCompOpen(false); }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE UPLOAD MODAL
// Week 1: AI sees schedule + goals → basic plan
// Week 2+: AI sees schedule + ALL accumulated observations + notes context → smarter plan
// ═══════════════════════════════════════════════════════════════════════════════
function ScheduleUploadModal({ workerUrl, weekStart: ws, onClose }) {
  const [file, setFile]   = useState(null);
  const [prev, setPrev]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [err, setErr]         = useState(null);

  const generate = async () => {
    if (!file) { setErr("Upload your schedule first."); return; }
    if (!workerUrl) { setErr("Set your Worker URL in settings."); return; }
    setLoading(true); setErr(null);
    try {
      const r = new FileReader();
      const b64 = await new Promise((res, rej) => {
        r.onload = () => res({ data: r.result.split(",")[1], type: file.type });
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const res = await api("/workout/generate-week", {
        method: "POST",
        body: JSON.stringify({ week_start: ws, schedule_image: b64 }),
      });
      setResult(res.reasoning);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div>
            <div className="mt">Upload Weekly Schedule</div>
            <div className="ms">Photo or screenshot of your schedule</div>
          </div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.55}}>
            The Worker will pass your schedule to AI along with all your accumulated day observations, workout notes, and notes context — so each week's plan is smarter than the last.
          </div>
          {prev
            ? <img src={prev} className="upr" alt="schedule"/>
            : <div className="uz" onClick={() => document.getElementById("sched-inp")?.click()}>
                <div style={{fontSize:24,marginBottom:5}}>📅</div>
                <div style={{fontSize:13,color:"var(--m2)"}}><b style={{color:"var(--t)"}}>Tap to upload</b> your schedule</div>
              </div>
          }
          <input id="sched-inp" type="file" accept="image/*" style={{display:"none"}}
            onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setPrev(URL.createObjectURL(f)); } }}/>
          <Err msg={err}/>
          {result && (
            <div>
              <AiBox label="AI Reasoning for this week's plan" text={result}/>
              <div style={{fontSize:12,color:"var(--a)",marginTop:8}}>✓ Workouts generated — check Blueprint tab</div>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={generate} disabled={!file || loading}>
            {loading ? <><Dots/> Generating week…</> : "✦ Generate This Week"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BODY COMP MODAL — AI gets entire week of observations, not just the screenshot
// ═══════════════════════════════════════════════════════════════════════════════
function BodyCompModal({ workerUrl, weekStart: ws, onClose, onDone }) {
  const [file, setFile]   = useState(null);
  const [prev, setPrev]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  const analyze = async () => {
    if (!file) { setErr("Upload body comp screenshot."); return; }
    if (!workerUrl) { setErr("Set your Worker URL."); return; }
    setLoading(true); setErr(null);
    try {
      const r = new FileReader();
      const b64 = await new Promise((res, rej) => {
        r.onload = () => res({ data: r.result.split(",")[1], type: file.type });
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      // Worker will attach all week observations + previous body comp automatically
      const res = await api("/analyze/body-comp", {
        method: "POST",
        body: JSON.stringify({ week_start: ws, image: b64 }),
      });
      onDone(res.analysis);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <div><div className="mt">Upload Body Composition</div><div className="ms">Samsung Health body comp screenshot</div></div>
          <button className="mcl" onClick={onClose}>×</button>
        </div>
        <div className="mb">
          <div style={{fontSize:12,color:"var(--m2)",marginBottom:10,lineHeight:1.55}}>
            AI will receive this screenshot plus all 7 day observations from this week, your workout notes, your personal notes context, and previous body comp analyses — all together in one call.
          </div>
          {prev
            ? <img src={prev} className="upr" alt="body comp"/>
            : <div className="uz" onClick={() => document.getElementById("comp-inp")?.click()}>
                <div style={{fontSize:24,marginBottom:5}}>📐</div>
                <div style={{fontSize:13,color:"var(--m2)"}}><b style={{color:"var(--t)"}}>Tap to upload</b></div>
              </div>
          }
          <input id="comp-inp" type="file" accept="image/*" style={{display:"none"}}
            onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setPrev(URL.createObjectURL(f)); } }}/>
          <Err msg={err}/>
        </div>
        <div className="mf">
          <button className="btn bs" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={analyze} disabled={!file || loading}>
            {loading ? <><Dots/> Analyzing everything…</> : "✦ Analyze with Full Context"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS SECTION — single-line cards, AI assesses every goal immediately
// ═══════════════════════════════════════════════════════════════════════════════
function GoalsSection({ workerUrl }) {
  const [goals, setGoals]   = useState([]);
  const [input, setInput]   = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workerUrl) { setLoading(false); return; }
    api("/goals").then(d => { setGoals(d.goals || []); setLoading(false); }).catch(() => setLoading(false));
  }, [workerUrl]);

  const addGoal = async () => {
    if (!input.trim() || !workerUrl) return;
    setAdding(true);
    const optimistic = { id: Date.now(), text: input.trim(), ai_insight: null, done: false, created_at: new Date().toISOString() };
    setGoals(g => [optimistic, ...g]);
    setInput("");
    try {
      // Worker calls Gemini with: goal text + existing goals + recent body comp + recent week summary
      const res = await api("/goals", { method: "POST", body: JSON.stringify({ text: optimistic.text }) });
      setGoals(g => g.map(x => x.id === optimistic.id ? { ...x, id: res.id, ai_insight: res.ai_insight } : x));
    } catch(e) {
      setGoals(g => g.map(x => x.id === optimistic.id ? { ...x, ai_insight: "Could not analyze — check Worker connection." } : x));
    }
    setAdding(false);
  };

  const toggleDone = async (id, done) => {
    setGoals(g => g.map(x => x.id === id ? {...x, done: !done} : x));
    if (workerUrl) await api(`/goals/${id}`, { method: "PATCH", body: JSON.stringify({ done: !done }) }).catch(() => {});
  };

  const deleteGoal = async (id) => {
    setGoals(g => g.filter(x => x.id !== id));
    if (workerUrl) await api(`/goals/${id}`, { method: "DELETE" }).catch(() => {});
  };

  if (loading) return <div style={{textAlign:"center",padding:"30px",color:"var(--m)"}}><Dots/></div>;

  return (
    <div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700}}>Fitness Goals</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:2}}>
          Type any goal in plain language — AI assesses it immediately using your current data
        </div>
      </div>

      <div className="goal-input-wrap">
        <input className="goal-input"
          placeholder="e.g. Do 15 pull-ups by July · Reach 18% body fat · Run 5K without stopping"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addGoal()}
          disabled={adding}
        />
        <button className="btn bp bsm" onClick={addGoal} disabled={adding || !input.trim()}>
          {adding ? <Dots/> : "Add"}
        </button>
      </div>

      {goals.length === 0 && (
        <div style={{textAlign:"center",padding:"28px 0",color:"var(--m)",fontSize:12}}>
          No goals yet. Add your first one above.
        </div>
      )}

      {goals.map(g => (
        <div key={g.id} className={"goal-card"+(g.done?" done":"")}>
          <div className="goal-text">
            <span style={{textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <button className="gc-btn" title={g.done?"Reopen":"Done"} onClick={() => toggleDone(g.id, g.done)}>
                {g.done ? "↩" : "✓"}
              </button>
              <button className="gc-btn" onClick={() => deleteGoal(g.id)}>✕</button>
            </div>
          </div>
          <div className="goal-date">
            {new Date(g.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
          </div>
          {g.ai_insight === null
            ? <div style={{fontSize:11,color:"var(--m)",display:"flex",alignItems:"center",gap:5}}><Dots/> AI analyzing…</div>
            : <div className="goal-ai">{g.ai_insight}</div>
          }
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES TAB — free-form notes that AI processes into context for all future calls
// ═══════════════════════════════════════════════════════════════════════════════

// TODO: Build this module
// When building, Notes tab:
//   1. Free-form text entries (anything — travel times, preferences, constraints)
//   2. "Process All Notes" button → Worker calls AI to extract structured context
//   3. Extracted context is stored in notes_context table
//   4. Every future AI call (schedule gen, body comp, weekly review) gets this context attached
//
// Example notes the user might add:
//   "Takes me 45 min to get to college and 20 min to work"
//   "I hate working out before 7am"
//   "I feel best after eating. Bad workouts on empty stomach."
//   "My gym closes at 10pm"
//   "I have a bad left shoulder. No overhead pressing."
//
// All of this gets extracted and injected into every relevant AI prompt.

function NotesTab({ workerUrl }) {
  const [notes, setNotes]           = useState([]);
  const [context, setContext]        = useState(null);
  const [input, setInput]            = useState("");
  const [adding, setAdding]          = useState(false);
  const [processing, setProcessing]  = useState(false);
  const [loading, setLoading]        = useState(true);

  useEffect(() => {
    if (!workerUrl) { setLoading(false); return; }
    Promise.all([
      api("/notes").catch(() => ({ notes: [] })),
      api("/notes/context").catch(() => ({ context: null })),
    ]).then(([n, c]) => {
      setNotes(n.notes || []);
      setContext(c.context || null);
      setLoading(false);
    });
  }, [workerUrl]);

  const addNote = async () => {
    if (!input.trim() || !workerUrl) return;
    setAdding(true);
    try {
      const res = await api("/notes", { method: "POST", body: JSON.stringify({ content: input.trim() }) });
      setNotes(n => [res.note, ...n]);
      setInput("");
    } catch {}
    setAdding(false);
  };

  const processNotes = async () => {
    if (!workerUrl) return;
    setProcessing(true);
    try {
      // Worker feeds ALL notes to AI and extracts structured context
      // This context then gets injected into every schedule generation and analysis
      const res = await api("/notes/process", { method: "POST" });
      setContext(res.context);
    } catch(e) { alert(e.message); }
    setProcessing(false);
  };

  const deleteNote = async (id) => {
    setNotes(n => n.filter(x => x.id !== id));
    if (workerUrl) await api(`/notes/${id}`, { method: "DELETE" }).catch(() => {});
  };

  if (loading) return <div className="cnt" style={{textAlign:"center",padding:"30px",color:"var(--m)"}}><Dots/></div>;

  return (
    <div className="cnt">
      <div style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700}}>Personal Notes</div>
        <div style={{fontSize:11,color:"var(--m)",marginTop:2,lineHeight:1.5}}>
          Add anything about your life — commute times, preferences, constraints, injuries. AI reads all of this when planning your schedule.
        </div>
      </div>

      {/* Context card — shows what AI extracted from your notes */}
      {context && (
        <div className="card" style={{marginBottom:14,borderColor:"rgba(92,255,176,.2)"}}>
          <div className="ctitle" style={{color:"var(--a)"}}>✦ Active Context — injected into every AI call</div>
          <div style={{fontSize:12,color:"var(--m2)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{context}</div>
        </div>
      )}

      {/* Add note */}
      <textarea className="ta" style={{minHeight:80,marginBottom:8}}
        placeholder={"Add a note about anything that affects your fitness planning:\n• Travel times: College = 45 min commute, Work = 20 min\n• I hate working out before 7am\n• Bad left shoulder, no overhead pressing\n• I feel sluggish on Mondays after weekend"}
        value={input} onChange={e => setInput(e.target.value)}
      />
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button className="btn bs" onClick={processNotes} disabled={processing || notes.length === 0}>
          {processing ? <><Dots/> Processing…</> : "✦ Process All Notes → Update AI Context"}
        </button>
        <button className="btn bp bsm" onClick={addNote} disabled={adding || !input.trim()}>
          {adding ? <Dots/> : "Add"}
        </button>
      </div>

      {notes.length === 0 && (
        <div style={{textAlign:"center",padding:"24px 0",color:"var(--m)",fontSize:12}}>
          No notes yet. Add anything that helps AI understand your schedule and lifestyle.
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
    items={[{icon:"✏️",label:"Daily log → AI analysis"},{icon:"🎯",label:"Goal cards"},{icon:"✨",label:"Weekly AI insight"}]}/>;
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
  const [tab, setTab]           = useState("home");
  const [configOpen, setConfigOpen] = useState(false);
  // Worker URL stored in sessionStorage only — user enters it each session or we detect it
  const [workerUrl, setWorkerUrl] = useState(() => sessionStorage.getItem("lifeos_worker") || WORKER_URL);
  const [workerOk, setWorkerOk]   = useState(null);
  const [streak, setStreak]       = useState({ count: 0, message: "" });
  const [weekPlan, setWeekPlan]   = useState(null);

  // Check if Worker is reachable on load
  useEffect(() => {
    if (!workerUrl || workerUrl.includes("YOUR_SUBDOMAIN")) { setWorkerOk(false); return; }
    fetch(`${workerUrl}/health`).then(r => setWorkerOk(r.ok)).catch(() => setWorkerOk(false));
  }, [workerUrl]);

  // Load streak and current week plan
  useEffect(() => {
    if (!workerUrl || workerUrl.includes("YOUR_SUBDOMAIN")) return;
    api("/data/streak").then(d => setStreak(d)).catch(() => {});
    const ws = weekStart(todayStr());
    api(`/data/week/${ws}`).then(d => setWeekPlan(d)).catch(() => {});
  }, [workerUrl]);

  const saveWorkerUrl = (url) => {
    setWorkerUrl(url);
    sessionStorage.setItem("lifeos_worker", url);
  };

  const pending = 2; // placeholder — count from actual day data
  const TITLES = {
    home:    ["Today's"," Tasks"], fitness: ["Fit","ness"],
    notes:   ["My ","Notes"],      hobbies: ["Hob","bies"],
    skills:  ["My ","Skills"],     goals:   ["Life ","Goals"],
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="sb">
          <div className="logo">Life<em>OS</em></div>
          <div className="ns">Modules</div>
          {NAV.map(n => (
            <div key={n.id} className={"ni"+(tab===n.id?" on":"")} onClick={() => setTab(n.id)}>
              <span>{n.icon}</span><span>{n.label}</span>
              {n.id==="home" && pending>0 && <div className="dot"/>}
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
              {workerOk === null ? "Checking…" : workerOk ? "✦ Worker Connected" : "⚠ Worker not set"}
            </div>
            <button className="kb" onClick={() => setConfigOpen(true)}>
              ⚙ Configure Worker URL
            </button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="ptitle">{TITLES[tab][0]}<em>{TITLES[tab][1]}</em></div>
            <div className="pdate">{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
          </div>
          {tab==="home"    && <TodayTab   workerUrl={workerUrl} streak={streak} weekPlan={weekPlan}/>}
          {tab==="fitness" && <FitnessTab workerUrl={workerUrl}/>}
          {tab==="notes"   && <NotesTab   workerUrl={workerUrl}/>}
          {tab==="hobbies" && <HobbiesTab/>}
          {tab==="skills"  && <SkillsTab/>}
          {tab==="goals"   && <LifeGoalsTab/>}
        </div>

        <div className="mnav">
          <div className="mnav-items">
            {NAV.map(n => (
              <div key={n.id} className={"mni"+(tab===n.id?" on":"")} onClick={() => setTab(n.id)}>
                <div className="mni-ico">{n.icon}</div>
                <div className="mni-lbl">{n.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {configOpen && <ConfigModal onClose={() => setConfigOpen(false)} onSave={saveWorkerUrl} current={workerUrl}/>}
    </>
  );
}
