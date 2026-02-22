import { useState, useEffect, useRef, useCallback } from "react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..500&family=Geist+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --b3:oklch(0.83 0.13 76);--b4:oklch(0.76 0.16 74);--b5:oklch(0.70 0.18 72);--b6:oklch(0.62 0.17 70);
  --s950:oklch(0.09 0.015 255);--s900:oklch(0.12 0.018 255);--s800:oklch(0.16 0.018 256);--s700:oklch(0.21 0.018 257);--s600:oklch(0.27 0.015 258);
  --t1:oklch(0.95 0.005 255);--t2:oklch(0.68 0.012 255);--t3:oklch(0.48 0.010 255);--t4:oklch(0.33 0.008 255);
  --ok:oklch(0.60 0.22 148);--wa:oklch(0.72 0.19 70);--er:oklch(0.58 0.24 27);--in:oklch(0.57 0.20 245);
  --fD:'Bricolage Grotesque','DM Sans',sans-serif;--fB:'DM Sans',system-ui,sans-serif;--fM:'Geist Mono',monospace;
}
body{font-family:var(--fB);background:var(--s950);color:var(--t1);-webkit-font-smoothing:antialiased;line-height:1.5}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--s700);border-radius:999px}
:focus-visible{outline:2px solid var(--b5);outline-offset:2px;border-radius:4px}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
@keyframes pageIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes toastIn{from{opacity:0;transform:translateX(110%) scale(.95)}to{opacity:1;transform:none}}
@keyframes glow{0%,100%{box-shadow:0 0 0 0 oklch(.70 .18 72/30%)}50%{box-shadow:0 0 0 6px oklch(.70 .18 72/0%)}}
.fd{font-family:var(--fD)}.fm{font-family:var(--fM)}
.t1{color:var(--t1)}.t2{color:var(--t2)}.t3{color:var(--t3)}.tok{color:var(--ok)}.twa{color:var(--wa)}.ter{color:var(--er)}.tb{color:var(--b4)}
.flex{display:flex}.fcol{flex-direction:column}.f1{flex:1}.ac{align-items:center}.as{align-items:flex-start}
.jb{justify-content:space-between}.jc{justify-content:center}.je{justify-content:flex-end}
.g1{gap:4px}.g2{gap:8px}.g3{gap:12px}.g4{gap:16px}.g6{gap:24px}
.wf{width:100%}.hf{height:100%}.mw0{min-width:0}.oh{overflow:hidden}.oa{overflow:auto}.oya{overflow-y:auto}
.rel{position:relative}.abs{position:absolute}.sti{position:sticky}
.trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wnw{white-space:nowrap}.s0{flex-shrink:0}.mla{margin-left:auto}
.g2c{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3c{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.g4c{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.card{background:oklch(.12 .018 255/80%);backdrop-filter:blur(12px);border:1px solid oklch(.22 .018 255/60%);border-radius:12px;overflow:hidden}
.card:hover{border-color:oklch(.28 .018 255/70%)}
.ch{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid oklch(.20 .018 255/50%)}
.ct{font-family:var(--fD);font-size:14px;font-weight:700;color:var(--t1);letter-spacing:-.01em}
.cb{padding:16px 18px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border:1px solid;white-space:nowrap}
.bbr{background:oklch(.18 .04 55/30%);color:oklch(.75 .14 58);border-color:oklch(.30 .08 56)}
.bsi{background:oklch(.16 .02 255/40%);color:oklch(.78 .04 255);border-color:oklch(.32 .03 255)}
.bgo{background:oklch(.19 .07 80/35%);color:oklch(.82 .18 82);border-color:oklch(.38 .12 80)}
.bok{background:oklch(.60 .22 148/14%);color:oklch(.72 .22 148);border-color:oklch(.60 .22 148/25%)}
.bwa{background:oklch(.72 .19 70/14%);color:oklch(.80 .18 72);border-color:oklch(.72 .19 70/25%)}
.ber{background:oklch(.58 .24 27/14%);color:oklch(.70 .22 28);border-color:oklch(.58 .24 27/25%)}
.bin{background:oklch(.57 .20 245/14%);color:oklch(.70 .18 245);border-color:oklch(.57 .20 245/25%)}
.bnt{background:oklch(.20 .015 255);color:var(--t3);border-color:oklch(.28 .015 255)}
.bbd{background:oklch(.70 .18 72/14%);color:oklch(.83 .13 76);border-color:oklch(.70 .18 72/30%)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 14px;border-radius:8px;font-family:var(--fB);font-size:13px;font-weight:600;border:1px solid;cursor:pointer;transition:all .12s;white-space:nowrap}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btp{background:var(--b5);color:oklch(.10 .02 255);border-color:var(--b5)}
.btp:hover:not(:disabled){background:var(--b4);box-shadow:0 0 16px oklch(.70 .18 72/25%);transform:translateY(-1px)}
.bto{background:transparent;color:var(--t2);border-color:oklch(.28 .018 255)}
.bto:hover:not(:disabled){background:oklch(.18 .018 255);color:var(--t1);border-color:oklch(.34 .018 255)}
.btg{background:transparent;color:var(--t2);border-color:transparent}
.btg:hover:not(:disabled){background:oklch(.18 .018 255);color:var(--t1)}
.btb{background:oklch(.70 .18 72/14%);color:oklch(.83 .13 76);border-color:oklch(.70 .18 72/30%)}
.btb:hover:not(:disabled){background:oklch(.70 .18 72/22%)}
.bsm{padding:5px 10px;font-size:12px;border-radius:6px}
.blg{padding:10px 20px;font-size:15px;border-radius:10px}
.bic{padding:7px;width:32px;height:32px}
.btd{background:oklch(.58 .24 27/14%);color:oklch(.70 .22 28);border-color:oklch(.58 .24 27/30%)}
.btd:hover:not(:disabled){background:oklch(.58 .24 27/22%)}
.btok{background:oklch(.60 .22 148/14%);color:oklch(.72 .22 148);border-color:oklch(.60 .22 148/30%)}
.btok:hover:not(:disabled){background:oklch(.60 .22 148/22%)}
.inp{width:100%;height:38px;padding:0 12px;background:oklch(.16 .018 256/70%);border:1px solid oklch(.26 .018 257/80%);border-radius:8px;color:var(--t1);font-family:var(--fB);font-size:13.5px;transition:border-color .12s,box-shadow .12s;outline:none}
.inp::placeholder{color:var(--t4)}.inp:focus{border-color:var(--b5);box-shadow:0 0 0 3px oklch(.70 .18 72/18%)}
.inp.err{border-color:var(--er)}.inp.wi{padding-right:38px}
.inpw{position:relative}.inpi{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--t3);cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;transition:color .1s}
.lbl{font-size:12.5px;font-weight:500;color:var(--t2);display:block;margin-bottom:5px}
.ferr{font-size:11.5px;color:oklch(.70 .22 28);display:flex;align-items:center;gap:4px;margin-top:4px;animation:fadeIn .15s ease}
.sel{height:34px;padding:0 10px;background:oklch(.16 .018 256/70%);border:1px solid oklch(.26 .018 257/80%);border-radius:7px;color:var(--t1);font-family:var(--fB);font-size:13px;cursor:pointer;outline:none}
.sel:focus{border-color:var(--b5)}
.tw{border:1px solid oklch(.20 .018 255/60%);border-radius:10px;overflow:hidden}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;background:oklch(.14 .018 255/60%);border-bottom:1px solid oklch(.20 .018 255/60%);white-space:nowrap}
.tbl td{padding:10px 14px;border-bottom:1px solid oklch(.18 .018 255/50%);color:var(--t2);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}.tbl tr:hover td{background:oklch(.14 .018 255/40%);color:var(--t1)}.tbl tr{cursor:default;transition:background .08s}
.pt{height:6px;background:oklch(.20 .018 256);border-radius:999px;overflow:hidden}
.pf{height:100%;border-radius:999px;transition:width 1s cubic-bezier(.4,0,.2,1)}
.sk{background:linear-gradient(90deg,oklch(.18 .018 256) 0%,oklch(.24 .018 256) 50%,oklch(.18 .018 256) 100%);background-size:200% 100%;animation:shimmer 1.8s ease-in-out infinite;border-radius:6px}
.div{border:none;border-top:1px solid oklch(.22 .018 255/60%);margin:0}
.sv{font-family:var(--fD);font-size:30px;font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--t1)}
.sl{font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.sc{font-size:12px;color:var(--t3);margin-top:6px;display:flex;align-items:center;gap:5px}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dok{background:var(--ok);box-shadow:0 0 5px oklch(.60 .22 148/50%)}
.dwa{background:var(--wa);box-shadow:0 0 5px oklch(.72 .19 70/50%)}
.der{background:var(--er)}.din{background:var(--in)}.dnt{background:var(--s600)}
.lr{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;background:var(--s950);background-image:radial-gradient(ellipse at 15% 85%,oklch(.70 .18 72/7%) 0%,transparent 55%),radial-gradient(ellipse at 85% 15%,oklch(.57 .20 245/5%) 0%,transparent 55%)}
.lc{width:100%;max-width:400px;background:oklch(.12 .018 255/90%);backdrop-filter:blur(28px) saturate(1.4);border:1px solid oklch(.26 .02 255/60%);border-radius:16px;padding:34px 30px 28px;box-shadow:0 25px 50px -12px oklch(0 0 0/50%),0 0 0 1px oklch(.70 .18 72/4%) inset;animation:fadeUp .45s cubic-bezier(.34,1.56,.64,1) both}
.ar{display:flex;height:100dvh;overflow:hidden;background:var(--s950);animation:fadeIn .25s ease}
.sb{width:240px;height:100dvh;flex-shrink:0;display:flex;flex-direction:column;background:var(--s900);border-right:1px solid oklch(.20 .018 255/60%);transition:width .28s cubic-bezier(.4,0,.2,1);overflow:hidden;position:relative;z-index:10}
.sb.col{width:64px}
.sbl{display:flex;align-items:center;justify-content:space-between;padding:14px 13px 13px;border-bottom:1px solid oklch(.20 .018 255/50%);flex-shrink:0;min-height:56px}
.sbn{flex:1;overflow-y:auto;overflow-x:hidden;padding:6px 0;scrollbar-width:none}
.sbn::-webkit-scrollbar{display:none}
.sbs{margin-bottom:2px}
.sbsl{font-size:9.5px;font-weight:800;color:var(--t4);letter-spacing:.12em;text-transform:uppercase;padding:10px 14px 3px;white-space:nowrap;overflow:hidden;display:block}
.ni{display:flex;align-items:center;gap:9px;padding:7px 12px;margin:1px 7px;border-radius:7px;font-size:13px;font-weight:500;color:var(--t2);cursor:pointer;white-space:nowrap;overflow:hidden;position:relative;border:none;background:none;width:calc(100% - 14px);text-align:left;transition:background .1s,color .1s}
.ni:hover:not(.act){background:oklch(.18 .018 255);color:var(--t1)}
.ni.act{background:oklch(.70 .18 72/11%);color:oklch(.83 .13 76)}
.ni.act::before{content:'';position:absolute;left:-7px;top:50%;transform:translateY(-50%);width:3px;height:55%;background:var(--b5);border-radius:999px}
.nb{margin-left:auto;font-size:9.5px;font-weight:800;padding:1px 5px;border-radius:999px;min-width:17px;text-align:center;flex-shrink:0;animation:glow 2.5s ease-in-out infinite}
.nb.dn{background:var(--er);color:white}.nb.nw{background:var(--wa);color:oklch(.15 .02 60)}
.sbu{border-top:1px solid oklch(.20 .018 255/50%);padding:11px 13px;display:flex;align-items:center;gap:9px;flex-shrink:0;overflow:hidden}
.av{width:30px;height:30px;border-radius:50%;background:oklch(.70 .18 72/20%);border:1.5px solid oklch(.70 .18 72/40%);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;color:oklch(.83 .13 76);flex-shrink:0;font-family:var(--fD)}
.hdr{height:56px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:0 20px;background:oklch(.12 .018 255/90%);backdrop-filter:blur(20px) saturate(1.4);border-bottom:1px solid oklch(.20 .018 255/50%);position:relative;z-index:5}
.bc{display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--t3);flex:1;overflow:hidden}
.bcc{color:var(--t1);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hb{background:none;border:none;color:var(--t3);cursor:pointer;padding:6px;border-radius:7px;display:flex;align-items:center;transition:background .1s,color .1s;position:relative}
.hb:hover{background:oklch(.20 .018 255);color:var(--t2)}
.nd{position:absolute;top:4px;right:4px;width:7px;height:7px;background:var(--er);border-radius:50%;border:1.5px solid oklch(.12 .018 255)}
.ma{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.ct2{flex:1;overflow-y:auto;overflow-x:hidden}
.page{max-width:1380px;margin:0 auto;padding:24px 24px 48px;animation:pageIn .22s ease both}
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;gap:16px}
.ptl{font-family:var(--fD);font-size:24px;font-weight:800;color:var(--t1);letter-spacing:-.03em;line-height:1.2}
.ps{font-size:12.5px;color:var(--t3);margin-top:4px;display:flex;align-items:center;gap:8px}
.pa{display:flex;gap:8px;align-items:center;flex-shrink:0}
.eb{display:flex;align-items:center;gap:14px;padding:12px 16px;background:oklch(.70 .18 72/6%);border:1px solid oklch(.70 .18 72/22%);border-left:3px solid var(--b5);border-radius:10px;margin-bottom:22px}
.eb.info{background:oklch(.57 .20 245/5%);border-color:oklch(.57 .20 245/20%);border-left-color:var(--in)}
.eb.ok{background:oklch(.60 .22 148/5%);border-color:oklch(.60 .22 148/20%);border-left-color:var(--ok)}
.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:18px}
.kc{background:oklch(.12 .018 255/80%);backdrop-filter:blur(12px);border:1px solid oklch(.22 .018 255/60%);border-radius:11px;padding:16px 18px;transition:transform .15s,box-shadow .15s,border-color .15s;animation:slideIn .3s ease both}
.kc:hover{transform:translateY(-2px);box-shadow:0 10px 24px oklch(0 0 0/30%);border-color:oklch(.30 .018 255/70%)}
.kib{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tc{position:fixed;bottom:18px;right:18px;display:flex;flex-direction:column;gap:7px;z-index:9999;pointer-events:none}
.to{background:oklch(.16 .018 256/96%);backdrop-filter:blur(16px);border:1px solid oklch(.26 .018 255/70%);border-radius:10px;padding:11px 14px;box-shadow:0 20px 40px oklch(0 0 0/40%);min-width:260px;max-width:340px;pointer-events:all;animation:toastIn .3s cubic-bezier(.34,1.56,.64,1) both;display:flex;gap:9px;align-items:flex-start}
.tcl{background:none;border:none;color:var(--t3);cursor:pointer;font-size:16px;padding:0;margin-left:auto;line-height:1;flex-shrink:0}
.mb{max-width:70%;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.45;margin-bottom:6px}
.mo{background:oklch(.70 .18 72/18%);border:1px solid oklch(.70 .18 72/25%);color:var(--t1);margin-left:auto;border-bottom-right-radius:3px}
.mi{background:oklch(.18 .018 255);border:1px solid oklch(.24 .018 255);color:var(--t1);border-bottom-left-radius:3px}
.ms{background:oklch(.60 .22 148/10%);border:1px dashed oklch(.60 .22 148/30%);color:oklch(.70 .20 148);font-size:11.5px;padding:7px 12px;border-radius:8px;margin:6px auto;max-width:80%;text-align:center}
.mai{background:oklch(.57 .20 245/12%);border:1px solid oklch(.57 .20 245/25%);color:var(--t1);border-bottom-left-radius:3px}
.tabs{display:flex;gap:2px;border-bottom:1px solid oklch(.22 .018 255/60%);margin-bottom:18px}
.tab{padding:8px 14px;font-size:13px;font-weight:500;color:var(--t3);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .1s,border-color .1s}
.tab:hover{color:var(--t2)}.tab.act{color:oklch(.83 .13 76);border-bottom-color:var(--b5);font-weight:600}
.emp{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;gap:12px}
.epi{width:48px;height:48px;border-radius:12px;background:oklch(.18 .018 255);display:flex;align-items:center;justify-content:center;color:var(--t4)}
.ept{font-size:15px;font-weight:700;color:var(--t2);font-family:var(--fD)}.epd{font-size:13px;color:var(--t3);max-width:300px;line-height:1.5}
.sbr{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.sbl2{font-size:12px;font-weight:600;width:80px;flex-shrink:0;color:var(--t2)}
.sbt{flex:1;height:8px;background:oklch(.18 .018 256);border-radius:999px;overflow:hidden}
.sbf{height:100%;border-radius:999px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
.sbc{font-size:12px;font-weight:700;font-family:var(--fM);color:var(--t2);width:60px;text-align:right;flex-shrink:0}
@media(max-width:1100px){.kg{grid-template-columns:repeat(2,1fr)}.g4c{grid-template-columns:repeat(2,1fr)}.g3c{grid-template-columns:1fr}}
@media(max-width:700px){.sb{width:64px}.sb.col{width:64px}.kg{grid-template-columns:1fr 1fr}}
`;

function Ic({ p, size = 16, s = "currentColor", fill = "none", sw = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={s}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {(Array.isArray(p) ? p : [p]).map((d, i) =>
        typeof d === "string" ? (
          <path key={i} d={d} />
        ) : d.cx !== undefined ? (
          <circle key={i} {...d} />
        ) : d.x !== undefined ? (
          <rect key={i} {...d} />
        ) : d.pts !== undefined ? (
          <polyline key={i} points={d.pts} />
        ) : null,
      )}
    </svg>
  );
}
const I = {
  home: ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  db: [
    { cx: 12, cy: 5, rx: 9, ry: 3 },
    "M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5",
  ],
  building: ["M3 21h18", "M9 21V7l6-4v18", "M9 10h6", "M9 14h6"],
  users: [
    { cx: 9, cy: 7, r: 4 },
    "M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2",
    { cx: 17, cy: 11, r: 3 },
    "M23 21v-2a4 4 0 00-3-3.87",
  ],
  user: [{ cx: 12, cy: 8, r: 4 }, "M6 20v-2a6 6 0 0112 0v2"],
  upload: [
    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4",
    "M17 8l-5-5-5 5",
    "M12 3v12",
  ],
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  send: ["M22 2L11 13", "M22 2L15 22 11 13 2 9l20-7z"],
  clipboard: [
    "M9 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V8l-6-6z",
    "M13 2v6h6",
    "M9 13h6",
    "M9 17h4",
  ],
  chart: ["M18 20V10", "M12 20V4", "M6 20v-6"],
  settings: [
    { cx: 12, cy: 12, r: 3 },
    "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  ],
  bell: [
    "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9",
    "M13.73 21a2 2 0 01-3.46 0",
  ],
  eye: [
    { cx: 12, cy: 12, r: 3 },
    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8",
  ],
  eyeOff: [
    "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94",
    "M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19",
    "M1 1l22 22",
    "M10.59 10.59a3 3 0 104.24 4.24",
  ],
  arrow: ["M5 12h14", "M12 5l7 7-7 7"],
  chevL: ["M15 18l-6-6 6-6"],
  chevR: ["M9 18l6-6-6-6"],
  chevD: ["M6 9l6 6 6-6"],
  check: ["M20 6L9 17l-5-5"],
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  logout: [
    "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4",
    "M16 17l5-5-5-5",
    "M21 12H9",
  ],
  plus: ["M12 5v14", "M5 12h14"],
  refresh: [
    "M23 4v6h-6",
    "M1 20v-6h6",
    "M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  ],
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  msg: ["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
  mail: [
    "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
    "M22 6l-10 7L2 6",
  ],
  phone:
    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  trend: ["M23 6l-9.5 9.5-5-5L1 18", "M17 6h6v6"],
  package: [
    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  ],
  truck: [
    "M1 3h15v13H1z",
    "M16 8h4l3 3v5h-7V8z",
    { cx: 5.5, cy: 18.5, r: 2.5 },
    { cx: 18.5, cy: 18.5, r: 2.5 },
  ],
  credit: [
    "M3 3h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z",
    "M1 9h22",
  ],
  doc: [
    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
    "M14 2v6h6",
    "M16 13H8",
    "M16 17H8",
    "M10 9H8",
  ],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  heart:
    "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  list: [
    "M8 6h13",
    "M8 12h13",
    "M8 18h13",
    "M3 6h.01",
    "M3 12h.01",
    "M3 18h.01",
  ],
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  search: [{ cx: 11, cy: 11, r: 8 }, "M21 21l-4.35-4.35"],
  edit: [
    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7",
    "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  ],
  trash: [
    "M3 6h18",
    "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  ],
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  flag: [
    "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z",
    "M4 22v-7",
  ],
  robot: [
    { x: 9, y: 2, width: 6, height: 4, rx: 2 },
    { x: 2, y: 8, width: 20, height: 12, rx: 2 },
    "M7 14h.01",
    "M12 14h.01",
    "M17 14h.01",
    "M6 8V6",
    "M18 8V6",
  ],
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  layers: ["M12 2L2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  globe: [
    { cx: 12, cy: 12, r: 10 },
    "M2 12h20",
    "M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  ],
  info: [{ cx: 12, cy: 12, r: 10 }, "M12 16v-4", "M12 8h.01"],
  xmark: ["M18 6L6 18", "M6 6l12 12"],
  warning: [
    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  sparkle:
    "M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 01-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z",
  gift: [
    "M20 12v10H4V12",
    "M2 7h20v5H2z",
    "M12 22V7",
    "M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z",
    "M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
  ],
  network: [
    { cx: 12, cy: 5, r: 3 },
    { cx: 3, cy: 19, r: 3 },
    { cx: 21, cy: 19, r: 3 },
    "M12 8v4",
    "M8.83 15.67L5.64 17",
    "M15.17 15.67L18.36 17",
  ],
};

function Logo({ iconOnly = false, size = "md" }) {
  const s = { sm: [26, 17], md: [30, 20], lg: [36, 24] }[size];
  return (
    <div className="flex ac" style={{ gap: 8 }}>
      <svg
        width={s[0]}
        height={s[0]}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
      >
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          fill="oklch(0.70 0.18 72/13%)"
          stroke="oklch(0.70 0.18 72)"
          strokeWidth="1.3"
        />
        <path
          d="M16 10V22M11 14L16 10L21 14"
          stroke="oklch(0.82 0.18 82)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="22" r="2.2" fill="oklch(0.82 0.18 82)" />
      </svg>
      {!iconOnly && (
        <span
          style={{
            fontFamily: "var(--fD)",
            fontSize: s[1],
            fontWeight: 800,
            color: "var(--t1)",
            letterSpacing: "-0.035em",
            lineHeight: 1,
          }}
        >
          cerniq<span style={{ color: "var(--b5)" }}>.</span>
          <span
            style={{
              fontWeight: 400,
              fontSize: s[1] * 0.72,
              color: "var(--t3)",
            }}
          >
            app
          </span>
        </span>
      )}
    </div>
  );
}

function useToasts() {
  const [t, setT] = useState([]);
  const add = useCallback((x) => {
    const id = Date.now() + Math.random();
    setT((p) => [...p.slice(-4), { ...x, id }]);
    setTimeout(() => setT((p) => p.filter((i) => i.id !== id)), 4000);
  }, []);
  const rm = useCallback((id) => setT((p) => p.filter((i) => i.id !== id)), []);
  return { toasts: t, add, rm };
}

function Toasts({ toasts, rm }) {
  const ic = { success: "✓", error: "✕", info: "ⓘ", warning: "⚠" };
  const cl = {
    success: "var(--ok)",
    error: "var(--er)",
    info: "var(--in)",
    warning: "var(--wa)",
  };
  return (
    <div className="tc" role="live" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="to">
          <span
            style={{
              color: cl[t.type] || "var(--b4)",
              fontSize: 14,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {ic[t.type] || "•"}
          </span>
          <div className="f1 mw0">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
              {t.title}
            </div>
            {t.desc && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--t2)",
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {t.desc}
              </div>
            )}
          </div>
          <button className="tcl" onClick={() => rm(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function Skel({ h = 16, w = "100%", r = 6 }) {
  return (
    <div
      className="sk"
      style={{ height: h, width: w, borderRadius: r, flexShrink: 0 }}
    />
  );
}
function Spin({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      style={{
        animation: "spin .7s linear infinite",
        opacity: 0.8,
        flexShrink: 0,
      }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function Kpi({
  label,
  value,
  icon,
  color,
  bg,
  change,
  ctype,
  delay = 0,
  onClick,
}) {
  return (
    <div
      className="kc"
      style={{
        animationDelay: `${delay}s`,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div className="flex ac jb" style={{ marginBottom: 12 }}>
        <span className="sl">{label}</span>
        <div className="kib" style={{ background: bg }}>
          <Ic p={I[icon] || I.zap} size={15} s={color} />
        </div>
      </div>
      <div className="sv" style={{ color }}>
        {value}
      </div>
      {change && (
        <div className="sc">
          <span
            style={{
              color:
                ctype === "up"
                  ? "var(--ok)"
                  : ctype === "down"
                    ? "var(--er)"
                    : ctype === "warn"
                      ? "var(--wa)"
                      : "var(--t3)",
              fontWeight: 600,
            }}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}

function TBadge({ tier }) {
  const m = { bronze: "bbr", silver: "bsi", gold: "bgo" };
  return <span className={`badge ${m[tier] || "bnt"}`}>{tier}</span>;
}

function SBadge({ status }) {
  const m = {
    COMPLETED: ["bok", "Completat"],
    PROCESSING: ["bin", "În procesare"],
    FAILED: ["ber", "Eșuat"],
    PENDING: ["bwa", "Pending"],
    ACTIVE: ["bok", "Activ"],
    PAUSED: ["bnt", "Pauză"],
    OFFLINE: ["ber", "Offline"],
    BANNED: ["ber", "Banat"],
    COLD: ["bnt", "Cold"],
    CONTACTED_WA: ["bin", "Contactat WA"],
    CONTACTED_EMAIL: ["bin", "Contactat Email"],
    WARM_REPLY: ["bok", "Răspuns Primit"],
    NEGOTIATION: ["bwa", "Negociere"],
    CONVERTED: ["bok", "Convertit"],
    DEAD: ["ber", "Pierdut"],
    DRAFT: ["bnt", "Draft"],
    SENT: ["bin", "Trimis"],
    DELIVERED: ["bok", "Livrat"],
    PAID: ["bok", "Plătit"],
    OVERDUE: ["ber", "Restanță"],
    RISK_LOW: ["bok", "Risc Scăzut"],
    RISK_MED: ["bwa", "Risc Mediu"],
    RISK_HIGH: ["ber", "Risc Ridicat"],
    LOYAL: ["bgo", "Loyal"],
    AT_RISK: ["bwa", "La Risc"],
    CHURNED: ["ber", "Pierdut"],
    NEW: ["bin", "Nou"],
    IN_TRANSIT: ["bin", "În Tranzit"],
    RETURNED: ["ber", "Returnat"],
    MATCHED: ["bok", "Reconciliat"],
    UNMATCHED: ["bwa", "Nereconciliat"],
    DISCOVERY: ["bin", "Discovery"],
    PROPOSAL: ["bbd", "Propunere"],
    OBJECTION_HANDLING: ["bwa", "Obiecții"],
    CLOSING: ["bok", "Closing"],
    WON: ["bok", "WON"],
  };
  const [c, l] = m[status] || ["bnt", status];
  return <span className={`badge ${c}`}>{l}</span>;
}

function PH({ title, sub, badge, actions }) {
  return (
    <div className="ph">
      <div>
        <div className="flex ac g3">
          <h1 className="ptl fd">{title}</h1>
          {badge && <span className={`badge ${badge.c}`}>{badge.l}</span>}
        </div>
        {sub && <p className="ps">{sub}</p>}
      </div>
      {actions && <div className="pa">{actions}</div>}
    </div>
  );
}

function EB({ num, name, msg, type = "brand" }) {
  return (
    <div
      className={`eb${type === "info" ? " info" : type === "ok" ? " ok" : ""}`}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color:
              type === "info"
                ? "var(--in)"
                : type === "ok"
                  ? "var(--ok)"
                  : "var(--b4)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
            marginBottom: 2,
          }}
        >
          Etapa {num}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--t1)",
            fontFamily: "var(--fD)",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
      </div>
      <div
        style={{
          width: 1,
          height: 32,
          background: "oklch(.70 .18 72/25%)",
          flexShrink: 0,
        }}
      />
      <p style={{ fontSize: 13, color: "var(--t2)", flex: 1, lineHeight: 1.5 }}>
        {msg}
      </p>
    </div>
  );
}

const NAV = [
  {
    id: "n0",
    label: "PRINCIPAL",
    items: [{ id: "dash", label: "Dashboard", icon: "home" }],
  },
  {
    id: "n1",
    label: "ETAPA 1 — ENRICHMENT",
    items: [
      { id: "import", label: "Import Date", icon: "upload" },
      { id: "bronze", label: "Bronze Layer", icon: "db" },
      { id: "silver", label: "Silver Layer", icon: "building" },
      { id: "gold", label: "Gold Layer", icon: "star" },
      {
        id: "approvals",
        label: "Aprobări HITL",
        icon: "clipboard",
        badge: { n: 3, t: "dn" },
      },
    ],
  },
  {
    id: "n2",
    label: "ETAPA 2 — OUTREACH",
    items: [
      { id: "outreach", label: "Outreach Dashboard", icon: "send" },
      {
        id: "leads",
        label: "Lead-uri",
        icon: "users",
        badge: { n: 127, t: "nw" },
      },
      { id: "sequences", label: "Secvențe", icon: "layers" },
      { id: "templates", label: "Șabloane", icon: "doc" },
      { id: "phones", label: "Telefoane WA", icon: "phone" },
      {
        id: "review",
        label: "Review Queue",
        icon: "flag",
        badge: { n: 8, t: "dn" },
      },
    ],
  },
  {
    id: "n3",
    label: "ETAPA 3 — AI SALES",
    items: [
      { id: "ai_dash", label: "AI Sales Dashboard", icon: "robot" },
      {
        id: "negs",
        label: "Negocieri Active",
        icon: "msg",
        badge: { n: 5, t: "nw" },
      },
      { id: "offers", label: "Oferte & Proforma", icon: "doc" },
      { id: "invoices", label: "Facturi & e-Factura", icon: "dollar" },
      { id: "guards", label: "Guardrails AI", icon: "shield" },
    ],
  },
  {
    id: "n4",
    label: "ETAPA 4 — POST-VÂNZARE",
    items: [
      { id: "payments", label: "Plăți Revolut", icon: "credit" },
      { id: "credit", label: "Credit Scoring", icon: "shield" },
      { id: "logistics", label: "Logistică AWB", icon: "truck" },
      { id: "returns", label: "Retururi RMA", icon: "refresh" },
    ],
  },
  {
    id: "n5",
    label: "ETAPA 5 — NURTURING",
    items: [
      { id: "nurturing", label: "Retenție Clienți", icon: "heart" },
      { id: "referrals", label: "Referrals", icon: "gift" },
      { id: "churn", label: "Churn Risk", icon: "activity" },
      { id: "geomap", label: "Hartă Geografică", icon: "globe" },
    ],
  },
  {
    id: "ns",
    label: "SISTEM",
    items: [
      { id: "workers", label: "Workers Status", icon: "zap" },
      { id: "settings", label: "Setări", icon: "settings" },
    ],
  },
];
const ALL = NAV.flatMap((s) => s.items);
function findItem(id) {
  return ALL.find((i) => i.id === id) || ALL[0];
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("alex@cerniq.app");
  const [pwd, setPwd] = useState("demo1234");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const er = {};
    if (!email.trim()) er.email = "Email obligatoriu";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      er.email = "Email invalid";
    if (!pwd || pwd.length < 4) er.pwd = "Parolă min 4 caractere";
    if (Object.keys(er).length) {
      setErrs(er);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    onLogin({
      name: "Alex Ionescu",
      role: "Administrator",
      email: email.trim(),
    });
  };
  return (
    <div className="lr">
      <main className="lc">
        <div style={{ marginBottom: 22 }}>
          <Logo />
          <p style={{ fontSize: 12, color: "var(--t3)", marginTop: 7 }}>
            Automatizare vânzări B2B · Agricultură Românească
          </p>
        </div>
        <hr className="div" style={{ marginBottom: 22 }} />
        <div onKeyDown={(e) => e.key === "Enter" && submit(e)}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="em" className="lbl">
              Email
            </label>
            <input
              ref={ref}
              id="em"
              type="email"
              autoComplete="email"
              className={`inp${errs.email ? " err" : ""}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrs((p) => ({ ...p, email: "" }));
              }}
            />
            {errs.email && <span className="ferr">⚠ {errs.email}</span>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="pw" className="lbl">
              Parolă
            </label>
            <div className="inpw">
              <input
                id="pw"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                className={`inp wi${errs.pwd ? " err" : ""}`}
                value={pwd}
                onChange={(e) => {
                  setPwd(e.target.value);
                  setErrs((p) => ({ ...p, pwd: "" }));
                }}
              />
              <button
                type="button"
                className="inpi"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ascunde" : "Arată"}
              >
                <Ic p={I[show ? "eyeOff" : "eye"]} size={14} />
              </button>
            </div>
            {errs.pwd && <span className="ferr">⚠ {errs.pwd}</span>}
          </div>
          <button
            type="button"
            className="btn btp blg wf"
            style={{ justifyContent: "center" }}
            disabled={loading}
            onClick={submit}
          >
            {loading ? (
              <>
                <Spin size={15} />
                <span>Se autentifică...</span>
              </>
            ) : (
              <>
                <span>Intră în cont</span>
                <Ic p={I.arrow} size={15} />
              </>
            )}
          </button>
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--t4)",
            textAlign: "center",
            marginTop: 14,
          }}
        >
          Demo precompletat · Apasă{" "}
          <strong style={{ color: "var(--t3)" }}>Intră în cont</strong>
        </p>
      </main>
      <footer
        style={{ fontSize: 11, color: "var(--t3)", display: "flex", gap: 8 }}
      >
        <span>© 2026 Cerniq.app</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span style={{ color: "var(--t3)" }}>GDPR</span>
      </footer>
    </div>
  );
}

function Shell({ user, onLogout, toast }) {
  const [page, setPage] = useState("dash");
  const [col, setCol] = useState(false);
  const cur = findItem(page);
  return (
    <div className="ar">
      <nav className={`sb${col ? " col" : ""}`}>
        <div className="sbl">
          <Logo size="sm" iconOnly={col} />
          <button className="btn btg bic" onClick={() => setCol((p) => !p)}>
            <Ic p={I[col ? "chevR" : "chevL"]} size={13} />
          </button>
        </div>
        <div className="sbn">
          {NAV.map((sec) => (
            <div key={sec.id} className="sbs">
              {!col && <span className="sbsl">{sec.label}</span>}
              {sec.items.map((item) => (
                <button
                  key={item.id}
                  className={`ni${page === item.id ? " act" : ""}`}
                  onClick={() => setPage(item.id)}
                  title={col ? item.label : undefined}
                >
                  <Ic p={I[item.icon] || I.zap} size={15} />
                  {!col && (
                    <>
                      <span className="f1 trunc">{item.label}</span>
                      {item.badge && (
                        <span className={`nb ${item.badge.t}`}>
                          {item.badge.n > 99 ? "99+" : item.badge.n}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="sbu">
          <div className="av">{user.name.charAt(0)}</div>
          {!col && (
            <>
              <div className="f1 mw0">
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--t1)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--t3)" }}>
                  {user.role}
                </div>
              </div>
              <button
                className="btn btg bic"
                onClick={() => {
                  onLogout();
                  toast.add({ type: "success", title: "Deconectat" });
                }}
                title="Logout"
              >
                <Ic p={I.logout} size={14} />
              </button>
            </>
          )}
        </div>
      </nav>
      <div className="ma">
        <header className="hdr">
          <nav className="bc">
            <span>cerniq.app</span>
            <span style={{ opacity: 0.4, fontSize: 11 }}>›</span>
            <span className="bcc">{cur.label}</span>
          </nav>
          <div className="flex ac g2">
            <button
              className="hb"
              onClick={() =>
                toast.add({ type: "info", title: "3 aprobări pending" })
              }
              style={{ position: "relative" }}
            >
              <Ic p={I.bell} size={17} />
              <span className="nd" />
            </button>
            <button className="hb" onClick={() => setPage("settings")}>
              <Ic p={I.settings} size={16} />
            </button>
            <div className="av" style={{ cursor: "pointer" }} title={user.name}>
              {user.name.charAt(0)}
            </div>
          </div>
        </header>
        <main className="ct2">
          <div className="page">
            <PageRouter page={page} setPage={setPage} toast={toast} />
          </div>
        </main>
      </div>
    </div>
  );
}

function PageRouter({ page, setPage, toast }) {
  const p = { setPage, toast };
  const m = {
    dash: Dash,
    import: Import,
    bronze: Bronze,
    silver: Silver,
    gold: Gold,
    approvals: Approvals,
    outreach: Outreach,
    leads: Leads,
    sequences: Seqs,
    templates: Templates,
    phones: Phones,
    review: Review,
    ai_dash: AiDash,
    negs: Negs,
    offers: Offers,
    invoices: Invoices,
    guards: Guards,
    payments: Payments,
    credit: Credit,
    logistics: Logistics,
    returns: Returns,
    nurturing: Nurturing,
    referrals: Referrals,
    churn: Churn,
    geomap: GeoMap,
    workers: Workers,
    settings: Settings,
  };
  const C = m[page] || Dash;
  return <C key={page} {...p} />;
}

function Dash({ setPage, toast }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOk(true), 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <PH
        title="Dashboard"
        sub="Pipeline complet · Toate cele 5 etape"
        badge={{ c: "bbd", l: "Live" }}
        actions={
          <>
            <button
              className="btn bto bsm"
              onClick={() => {
                setOk(false);
                setTimeout(() => setOk(true), 700);
                toast.add({ type: "success", title: "Actualizat" });
              }}
            >
              <Ic p={I.refresh} size={12} />
              Refresh
            </button>
            <button className="btn btp bsm" onClick={() => setPage("import")}>
              <Ic p={I.upload} size={12} />
              Import
            </button>
          </>
        }
      />
      <EB
        num="0→5"
        name="Infrastructură Completă"
        msg="Explorați cele 5 etape din sidebar. Login funcționează! Toate paginile au date mock realiste."
      />
      {!ok ? (
        <div className="kg">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="kc">
              <Skel h={14} w="60%" />
              <div style={{ marginTop: 10 }}>
                <Skel h={30} w="40%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kg">
          <Kpi
            label="Bronze Contacts"
            value="47,382"
            icon="db"
            color="oklch(.75 .14 58)"
            bg="oklch(.18 .04 55/30%)"
            change="+1,203 azi"
            ctype="up"
            delay={0.05}
            onClick={() => setPage("bronze")}
          />
          <Kpi
            label="Silver Companies"
            value="8,941"
            icon="building"
            color="oklch(.78 .04 255)"
            bg="oklch(.16 .02 255/40%)"
            change="+284 enriched"
            ctype="up"
            delay={0.1}
            onClick={() => setPage("silver")}
          />
          <Kpi
            label="Gold Qualified"
            value="1,247"
            icon="star"
            color="oklch(.82 .18 82)"
            bg="oklch(.19 .07 80/35%)"
            change="+67 promovați"
            ctype="up"
            delay={0.15}
            onClick={() => setPage("gold")}
          />
          <Kpi
            label="Venituri Luna"
            value="€184K"
            icon="dollar"
            color="var(--ok)"
            bg="oklch(.60 .22 148/12%)"
            change="+18% vs target"
            ctype="up"
            delay={0.2}
            onClick={() => setPage("payments")}
          />
        </div>
      )}
      <div className="g2c" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="ch">
            <span className="ct">Pipeline Funnel</span>
          </div>
          <div className="cb">
            {[
              ["Bronze", 47382, 100, "oklch(.75 .14 58)"],
              ["Silver", 8941, 18.8, "oklch(.78 .04 255)"],
              ["Gold", 1247, 2.6, "oklch(.82 .18 82)"],
              ["Leads", 890, 1.9, "var(--in)"],
              ["Negociere", 234, 0.5, "var(--wa)"],
              ["Convertit", 89, 0.19, "var(--ok)"],
            ].map(([l, v, pct, c]) => (
              <div key={l} className="sbr">
                <span className="sbl2" style={{ width: 70 }}>
                  {l}
                </span>
                <div className="sbt">
                  <div
                    className="sbf"
                    style={{ width: `${pct}%`, background: c, opacity: 0.8 }}
                  />
                </div>
                <span className="sbc">{v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <span className="ct">Activitate Recentă</span>
            <span style={{ fontSize: 11, color: "var(--t3)" }}>2h</span>
          </div>
          <div className="cb">
            {[
              [
                "ok",
                "847 leads contactați WA — Secvența Agricultori Ialomița",
                "3 min",
              ],
              [
                "in",
                "AI Agent a generat ofertă proformă — SC Ferma Dunărea SA",
                "12 min",
              ],
              ["wa", "8 mesaje necesită review uman HITL", "28 min"],
              [
                "ok",
                "Plată confirmată €12,400 — SC Ferma Dunărea SA",
                "45 min",
              ],
              [
                "in",
                "Credit scoring actualizat — 23 companii Termene.ro",
                "1h",
              ],
              [
                "ok",
                "AWB generat ENE324892RO · Sameday · Ialomița",
                "1h 20min",
              ],
            ].map(([d, txt, t], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  paddingBottom: 9,
                  borderBottom:
                    i < 5 ? "1px solid oklch(.20 .018 255/40%)" : "none",
                  marginBottom: i < 5 ? 9 : 0,
                }}
              >
                <span
                  className={`dot d${d}`}
                  style={{ marginTop: 4, flexShrink: 0 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--t2)",
                      lineHeight: 1.45,
                    }}
                  >
                    {txt}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--t4)",
                      marginTop: 2,
                      fontFamily: "var(--fM)",
                    }}
                  >
                    {t} în urmă
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="g3c">
        {[
          {
            title: "Outreach Azi",
            rows: [
              ["Contacte WA", "847/4000", "ok"],
              ["Email-uri", "234", "in"],
              ["Răspunsuri", "127 (15%)", "ok"],
              ["Review Pending", "8", "wa"],
            ],
            pg: "outreach",
          },
          {
            title: "Infrastructure",
            rows: [
              ["PostgreSQL 18.1", "Online · 99.9%", "ok"],
              ["Redis 7.4.7", "Online · 0.2ms", "ok"],
              ["BullMQ Workers", "47 activi", "ok"],
              ["API Fastify", "Online · 12ms", "ok"],
            ],
            pg: "workers",
          },
          {
            title: "KPI Lunar",
            rows: [
              ["Noi Clienți", "89 (+12%)", "ok"],
              ["Churn Rate", "2.3% (-0.4%)", "ok"],
              ["CAC Mediu", "€184", "in"],
              ["CLTV Mediu", "€2,840", "ok"],
            ],
            pg: "nurturing",
          },
        ].map((w, i) => (
          <div key={i} className="card">
            <div className="ch">
              <span className="ct">{w.title}</span>
              <button
                className="btn btg bsm"
                onClick={() => setPage(w.pg)}
                style={{ padding: "3px 8px", fontSize: 11 }}
              >
                Ver →
              </button>
            </div>
            <div className="cb">
              {w.rows.map(([k, v, s], j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom:
                      j < 3 ? "1px solid oklch(.20 .018 255/30%)" : "none",
                  }}
                >
                  <span style={{ fontSize: 12.5, color: "var(--t2)" }}>
                    {k}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: "var(--fM)",
                      color: `var(--${s})`,
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Import({ toast }) {
  const [drag, setDrag] = useState(false);
  const rows = [
    [
      "21 Feb 2026",
      "fermieri_ialomita_q1.csv",
      "CSV",
      "2.4 MB",
      12483,
      98.2,
      "COMPLETED",
    ],
    [
      "19 Feb 2026",
      "apia_beneficiari_2025.xlsx",
      "Excel",
      "5.7 MB",
      31204,
      96.8,
      "COMPLETED",
    ],
    [
      "18 Feb 2026",
      "onrc_extractie_feb.csv",
      "CSV",
      "1.2 MB",
      5891,
      99.1,
      "COMPLETED",
    ],
    [
      "17 Feb 2026",
      "madr_cooperative.xlsx",
      "Excel",
      "0.8 MB",
      2341,
      95.4,
      "COMPLETED",
    ],
    ["15 Feb 2026", "termene_export.csv", "CSV", "3.1 MB", 18920, 0, "FAILED"],
  ];
  return (
    <>
      <PH
        title="Import Date"
        sub="Bronze Layer · Ingestie date brute"
        actions={
          <button className="btn btp bsm">
            <Ic p={I.plus} size={12} />
            Import Nou
          </button>
        }
      />
      <EB
        num="1"
        name="Data Enrichment"
        msg="Importați CSV/Excel din ANAF, APIA, MADR sau ONRC. Pipeline automat Bronze → Silver → Gold."
      />
      <div
        style={{
          border: `2px dashed ${drag ? "var(--b5)" : "oklch(.28 .018 255)"}`,
          borderRadius: 12,
          padding: "32px 24px",
          textAlign: "center",
          marginBottom: 20,
          background: drag ? "oklch(.70 .18 72/5%)" : "oklch(.12 .018 255/50%)",
          transition: "all .2s",
          cursor: "pointer",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          toast.add({
            type: "success",
            title: "Fișier detectat",
            desc: "Procesare în curs...",
          });
        }}
        onClick={() =>
          toast.add({
            type: "success",
            title: "demo_fermieri.csv încărcat",
            desc: "12,483 rânduri detectate",
          })
        }
      >
        <div
          style={{
            color: "var(--t3)",
            marginBottom: 10,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Ic p={I.upload} size={32} />
        </div>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--t2)",
            marginBottom: 4,
          }}
        >
          Trageți CSV/Excel sau click pentru upload
        </p>
        <p style={{ fontSize: 12, color: "var(--t4)" }}>
          CSV · Excel · JSON · Max 100MB · UTF-8
        </p>
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Istoric Import-uri</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Fișier</th>
                <th>Tip</th>
                <th>Size</th>
                <th>Rânduri</th>
                <th>Succes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([dt, f, t, sz, nr, s, st], i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {dt}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{f}</td>
                  <td>
                    <span className="badge bnt">{t}</span>
                  </td>
                  <td style={{ fontFamily: "var(--fM)" }}>{sz}</td>
                  <td style={{ fontFamily: "var(--fM)" }}>
                    {nr.toLocaleString()}
                  </td>
                  <td>
                    <div className="flex ac g2">
                      <div className="pt" style={{ width: 60 }}>
                        <div
                          className="pf"
                          style={{
                            width: `${s}%`,
                            background:
                              s > 95
                                ? "var(--ok)"
                                : s > 0
                                  ? "var(--wa)"
                                  : "var(--er)",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--fM)",
                          color: s > 95 ? "var(--ok)" : "var(--er)",
                        }}
                      >
                        {s > 0 ? s + "%" : "—"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <SBadge status={st} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Bronze({ toast }) {
  const [q, setQ] = useState("");
  const rows = [
    [
      "Ion Popescu PFA",
      "RO12345678",
      "Ialomița",
      "0740123456",
      "ion.p@gmail.com",
      "APIA",
      82,
      "PROCESSING",
    ],
    [
      "SC Agro Sud SRL",
      "RO44556677",
      "Călărași",
      "0766554433",
      "office@agrosud.ro",
      "CSV",
      91,
      "COMPLETED",
    ],
    [
      "SC Ferma Dunărea SA",
      "RO55443322",
      "Brăila",
      "0312445566",
      "contact@fermadunarea.ro",
      "ONRC",
      95,
      "COMPLETED",
    ],
    [
      "OUAI Ialomița Nord",
      "RO77889900",
      "Ialomița",
      "0243112233",
      "ouai.ialn@gmail.com",
      "MADR",
      88,
      "PROCESSING",
    ],
    [
      "Maria Ionescu",
      "RO87654321",
      "Dolj",
      "0721987654",
      "—",
      "ONRC",
      65,
      "COMPLETED",
    ],
    [
      "Vasile Constantin",
      "RO33221144",
      "Ialomița",
      "0758112233",
      "v.const@yahoo.com",
      "MADR",
      74,
      "COMPLETED",
    ],
  ];
  const f = rows.filter(
    (r) =>
      !q ||
      r[0].toLowerCase().includes(q.toLowerCase()) ||
      r[2].toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PH
        title="Bronze Layer"
        sub="Date brute importate"
        badge={{ c: "bbr", l: "47,382 total" }}
        actions={
          <button className="btn bto bsm">
            <Ic p={I.upload} size={12} />
            Export
          </button>
        }
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="Total"
          value="47,382"
          icon="db"
          color="oklch(.75 .14 58)"
          bg="oklch(.18 .04 55/30%)"
          change="+1,203 azi"
          ctype="up"
        />
        <Kpi
          label="În Procesare"
          value="3,421"
          icon="refresh"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
        />
        <Kpi
          label="Calitate Medie"
          value="78%"
          icon="chart"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="+2.3%"
          ctype="up"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Contacte Bronze</span>
          <div className="flex g2">
            <input
              className="inp"
              style={{ height: 32, width: 200 }}
              placeholder="Caută..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="sel">
              <option>Toate județele</option>
              <option>Ialomița</option>
              <option>Dolj</option>
              <option>Călărași</option>
            </select>
          </div>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nume</th>
                <th>CUI</th>
                <th>Județ</th>
                <th>Telefon</th>
                <th>Email</th>
                <th>Sursă</th>
                <th>Calitate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {f.map(([nm, cui, jud, tel, em, src, sc, st], i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{nm}</td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {cui}
                  </td>
                  <td>{jud}</td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {tel}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      color: em === "—" ? "var(--t4)" : "var(--t2)",
                    }}
                  >
                    {em}
                  </td>
                  <td>
                    <span className="badge bnt">{src}</span>
                  </td>
                  <td>
                    <div className="flex ac g2">
                      <div className="pt" style={{ width: 50 }}>
                        <div
                          className="pf"
                          style={{
                            width: `${sc}%`,
                            background:
                              sc > 80
                                ? "var(--ok)"
                                : sc > 60
                                  ? "var(--wa)"
                                  : "var(--er)",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontFamily: "var(--fM)" }}>
                        {sc}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <SBadge status={st} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Silver({ toast }) {
  const rows = [
    [
      "SC Ferma Dunărea SA",
      "RO55443322",
      "Brăila",
      true,
      true,
      95,
      "gold",
      "100+",
    ],
    [
      "SC Agro Sud SRL",
      "RO44556677",
      "Călărași",
      true,
      true,
      91,
      "gold",
      "50-100",
    ],
    [
      "Cooperativa Agriland",
      "RO11223344",
      "Ialomița",
      true,
      true,
      84,
      "silver",
      "50-100",
    ],
    [
      "OUAI Ialomița Nord",
      "RO77889900",
      "Ialomița",
      true,
      false,
      72,
      "silver",
      "10-50",
    ],
    [
      "Ion Popescu PFA",
      "RO12345678",
      "Ialomița",
      true,
      false,
      58,
      "bronze",
      "1-5",
    ],
  ];
  return (
    <>
      <PH
        title="Silver Layer"
        sub="Companii validate ANAF + Termene.ro"
        badge={{ c: "bsi", l: "8,941 total" }}
        actions={
          <>
            <button
              className="btn bto bsm"
              onClick={() =>
                toast.add({ type: "info", title: "Sync ANAF completat" })
              }
            >
              <Ic p={I.refresh} size={12} />
              Sync ANAF
            </button>
            <button
              className="btn btp bsm"
              onClick={() =>
                toast.add({
                  type: "success",
                  title: "12 companii promovate la Gold",
                })
              }
            >
              → Gold
            </button>
          </>
        }
      />
      <div className="kg">
        <Kpi
          label="Silver Total"
          value="8,941"
          icon="building"
          color="oklch(.78 .04 255)"
          bg="oklch(.16 .02 255/40%)"
          change="+284"
          ctype="up"
        />
        <Kpi
          label="Validate ANAF"
          value="8,234"
          icon="check"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="92%"
        />
        <Kpi
          label="Termene.ro"
          value="6,891"
          icon="shield"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
          change="77%"
        />
        <Kpi
          label="→ Gold"
          value="1,247"
          icon="star"
          color="oklch(.82 .18 82)"
          bg="oklch(.19 .07 80/35%)"
          change="+67 săpt."
          ctype="up"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Companii Silver</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Companie</th>
                <th>CUI</th>
                <th>Județ</th>
                <th>ANAF</th>
                <th>Termene</th>
                <th>Angajați</th>
                <th>Score</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([nm, cui, jud, an, tm, sc, tier, emp], i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{nm}</td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {cui}
                  </td>
                  <td>{jud}</td>
                  <td style={{ textAlign: "center", fontSize: 16 }}>
                    <span style={{ color: an ? "var(--ok)" : "var(--er)" }}>
                      {an ? "✓" : "✗"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontSize: 16 }}>
                    <span style={{ color: tm ? "var(--ok)" : "var(--er)" }}>
                      {tm ? "✓" : "✗"}
                    </span>
                  </td>
                  <td>{emp}</td>
                  <td>
                    <div className="flex ac g2">
                      <div className="pt" style={{ width: 50 }}>
                        <div
                          className="pf"
                          style={{
                            width: `${sc}%`,
                            background:
                              sc > 80
                                ? "var(--ok)"
                                : sc > 60
                                  ? "var(--wa)"
                                  : "var(--er)",
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                        {sc}
                      </span>
                    </div>
                  </td>
                  <td>
                    <TBadge tier={tier} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Gold({ toast }) {
  const rows = [
    [
      "SC Ferma Dunărea SA",
      "RO55443322",
      "Elena Dumitrescu",
      "Brăila",
      "€5.8M",
      "142",
      97,
      "CONTACTED_WA",
    ],
    [
      "SC Agro Sud SRL",
      "RO44556677",
      "Gheorghe Marin",
      "Călărași",
      "€2.1M",
      "67",
      94,
      "COLD",
    ],
    [
      "Cooperativa Agriland",
      "RO11223344",
      "Marin Popa",
      "Ialomița",
      "€1.4M",
      "52",
      87,
      "WARM_REPLY",
    ],
    [
      "OUAI Ialomița Nord",
      "RO77889900",
      "Ion Stroe",
      "Ialomița",
      "€0.8M",
      "18",
      81,
      "NEGOTIATION",
    ],
    [
      "SC AgroTech Dunărea",
      "RO99887766",
      "Vasile Iordache",
      "Brăila",
      "€3.2M",
      "89",
      92,
      "COLD",
    ],
  ];
  return (
    <>
      <PH
        title="Gold Layer"
        sub="Lead-uri calificate · Gata de outreach"
        badge={{ c: "bgo", l: "1,247 total" }}
        actions={
          <>
            <button className="btn bto bsm">
              <Ic p={I.filter} size={12} />
              Filtre
            </button>
            <button
              className="btn btp bsm"
              onClick={() =>
                toast.add({
                  type: "success",
                  title: "Outreach lansat",
                  desc: "47 leads înrolate",
                })
              }
            >
              <Ic p={I.send} size={12} />
              Lansează Outreach
            </button>
          </>
        }
      />
      <div className="kg">
        <Kpi
          label="Gold Leads"
          value="1,247"
          icon="star"
          color="oklch(.82 .18 82)"
          bg="oklch(.19 .07 80/35%)"
          change="+67"
          ctype="up"
        />
        <Kpi
          label="Gata Outreach"
          value="892"
          icon="send"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
          change="71.5%"
        />
        <Kpi
          label="Revenue Potențial"
          value="€18.4M"
          icon="dollar"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="+€2.1M"
          ctype="up"
        />
        <Kpi
          label="Score Mediu"
          value="89.4"
          icon="chart"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
          change="+1.2"
          ctype="up"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Lead-uri Gold</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Companie</th>
                <th>Contact</th>
                <th>Județ</th>
                <th>Cifră Afaceri</th>
                <th>Score</th>
                <th>Stadiu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([nm, cui, ct, jud, rev, emp, sc, st], i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--t1)" }}>
                      {nm}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--t4)",
                        fontFamily: "var(--fM)",
                      }}
                    >
                      {cui}
                    </div>
                  </td>
                  <td>{ct}</td>
                  <td>{jud}</td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 600,
                      color: "var(--ok)",
                    }}
                  >
                    {rev}
                  </td>
                  <td>
                    <div className="flex ac g2">
                      <div className="pt" style={{ width: 50 }}>
                        <div
                          className="pf"
                          style={{
                            width: `${sc}%`,
                            background: "oklch(.82 .18 82)",
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                        {sc}
                      </span>
                    </div>
                  </td>
                  <td>
                    <SBadge status={st} />
                  </td>
                  <td>
                    <button
                      className="btn btb bsm"
                      onClick={() =>
                        toast.add({ type: "success", title: `Outreach: ${nm}` })
                      }
                    >
                      <Ic p={I.send} size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Approvals({ toast }) {
  const [items, setItems] = useState([
    {
      id: 1,
      type: "Deduplicare",
      entity: "SC Agro Sud SRL vs Agro Sud România SRL",
      desc: "2 companii cu CUI diferit dar date similare — confirmare manuală necesară",
      conf: 87,
      urg: "HIGH",
    },
    {
      id: 2,
      type: "Email Discovery",
      entity: "Ion Popescu PFA",
      desc: "Email găsit Hunter.io: i.popescu@agriferm.ro — validare necesară",
      conf: 72,
      urg: "MED",
    },
    {
      id: 3,
      type: "Promovare Gold",
      entity: "Cooperativa Agriland",
      desc: "Score 84/100 — sub pragul automat 90 — aprobare manuală",
      conf: 84,
      urg: "LOW",
    },
  ]);
  const approve = (id) => {
    setItems((p) => p.filter((x) => x.id !== id));
    toast.add({ type: "success", title: "Aprobat ✓" });
  };
  const reject = (id) => {
    setItems((p) => p.filter((x) => x.id !== id));
    toast.add({ type: "info", title: "Respins" });
  };
  return (
    <>
      <PH
        title="Aprobări HITL"
        sub="Human-in-the-Loop · Acțiuni cu incertitudine ridicată"
        badge={{ c: "ber", l: `${items.length} pending` }}
      />
      <EB
        num="1"
        name="HITL Approval System"
        msg="AI escaladează automat deciziile cu incertitudine >30%. SLA: HIGH → 1h, MED → 4h, LOW → 24h."
        type="info"
      />
      {items.length === 0 ? (
        <div className="emp">
          <div className="epi">
            <Ic p={I.check} size={22} />
          </div>
          <p className="ept">Inbox gol!</p>
          <p className="epd">Toate aprobările au fost procesate.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((x) => (
            <div
              key={x.id}
              className="card"
              style={{
                borderColor:
                  x.urg === "HIGH"
                    ? "oklch(.58 .24 27/40%)"
                    : x.urg === "MED"
                      ? "oklch(.72 .19 70/30%)"
                      : "oklch(.22 .018 255/60%)",
              }}
            >
              <div className="cb" style={{ padding: "16px 20px" }}>
                <div className="flex as jb g4">
                  <div className="f1">
                    <div className="flex ac g3" style={{ marginBottom: 8 }}>
                      <span
                        className={`badge ${x.urg === "HIGH" ? "ber" : x.urg === "MED" ? "bwa" : "bnt"}`}
                      >
                        {x.urg}
                      </span>
                      <span className="badge bin">{x.type}</span>
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--t1)",
                        marginBottom: 5,
                      }}
                    >
                      {x.entity}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--t2)",
                        marginBottom: 10,
                      }}
                    >
                      {x.desc}
                    </p>
                    <div className="flex ac g3">
                      <span style={{ fontSize: 12, color: "var(--t3)" }}>
                        Confidence AI:
                      </span>
                      <div className="pt" style={{ width: 80 }}>
                        <div
                          className="pf"
                          style={{
                            width: `${x.conf}%`,
                            background: x.conf > 80 ? "var(--ok)" : "var(--wa)",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontFamily: "var(--fM)" }}>
                        {x.conf}%
                      </span>
                    </div>
                  </div>
                  <div className="flex g2">
                    <button
                      className="btn btok bsm"
                      onClick={() => approve(x.id)}
                    >
                      <Ic p={I.check} size={13} />
                      Aprobă
                    </button>
                    <button
                      className="btn btd bsm"
                      onClick={() => reject(x.id)}
                    >
                      <Ic p={I.xmark} size={13} />
                      Respinge
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Outreach({ setPage, toast }) {
  return (
    <>
      <PH
        title="Cold Outreach Dashboard"
        sub="WhatsApp + Email · Multi-canal"
        actions={
          <button className="btn btp bsm" onClick={() => setPage("sequences")}>
            <Ic p={I.plus} size={12} />
            Secvență Nouă
          </button>
        }
      />
      <EB
        num="2"
        name="Cold Outreach Multi-Canal"
        msg="20 numere WA × 200 mesaje/zi = 4,000 contacte/zi. Email cold via Instantly.ai cu warmup complet."
      />
      <div className="kg">
        <Kpi
          label="Leads Contactați Azi"
          value="847"
          icon="users"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
          change="+127 vs ieri"
          ctype="up"
        />
        <Kpi
          label="Răspunsuri"
          value="127 (15%)"
          icon="msg"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="+2.3%"
          ctype="up"
        />
        <Kpi
          label="Email-uri Trimise"
          value="234"
          icon="mail"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
          change="18.4% open rate"
        />
        <Kpi
          label="Review Pending"
          value="8"
          icon="flag"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
          ctype="warn"
          onClick={() => setPage("review")}
        />
      </div>
      <div className="g2c">
        <div className="card">
          <div className="ch">
            <span className="ct">Lead Funnel</span>
          </div>
          <div className="cb">
            {[
              ["COLD", 1250, "var(--t4)"],
              ["CONTACTED_WA", 890, "var(--in)"],
              ["CONTACTED_EMAIL", 340, "var(--b4)"],
              ["WARM_REPLY", 234, "var(--ok)"],
              ["NEGOTIATION", 89, "var(--wa)"],
              ["CONVERTED", 23, "var(--ok)"],
            ].map(([s, n, c]) => (
              <div key={s} className="sbr">
                <span style={{ width: 130, flexShrink: 0 }}>
                  <SBadge status={s} />
                </span>
                <div className="sbt">
                  <div
                    className="sbf"
                    style={{ width: `${(n / 1250) * 100}%`, background: c }}
                  />
                </div>
                <span className="sbc">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <span className="ct">Cotă WhatsApp — 20 Numere</span>
            <span style={{ fontSize: 11, color: "var(--t3)" }}>
              3,241/4,000
            </span>
          </div>
          <div className="cb">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10,1fr)",
                gap: 6,
                marginBottom: 10,
              }}
            >
              {[...Array(20)].map((_, i) => {
                const p2 = 20 + Math.floor(Math.sin(i * 2.7) * 30 + 50);
                const c =
                  p2 > 90 ? "var(--wa)" : p2 > 50 ? "var(--ok)" : "var(--in)";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 52,
                        background: "oklch(.18 .018 256)",
                        borderRadius: 5,
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid oklch(.24 .018 255)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          width: "100%",
                          height: `${p2}%`,
                          background: c,
                          borderRadius: 3,
                          transition: "height 1s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: "var(--fM)",
                        color: "var(--t3)",
                      }}
                    >
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <p
              style={{ fontSize: 11, color: "var(--t3)", textAlign: "center" }}
            >
              1 coloană = 1 număr WA · Limită 200 msg/zi
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Leads({ toast }) {
  const [filter, setFilter] = useState("ALL");
  const rows = [
    [
      "SC Ferma Dunărea SA",
      "Elena Dumitrescu",
      "0312445566",
      "WA",
      "WARM_REPLY",
      85,
      "Suntem interesați de...",
      "2h",
    ],
    [
      "Cooperativa Agriland",
      "Marin Popa",
      "0244556677",
      "WA",
      "NEGOTIATION",
      78,
      "Ce prețuri oferiți...",
      "4h",
    ],
    [
      "OUAI Ialomița Nord",
      "Ion Stroe",
      "0243112233",
      "EMAIL",
      "CONTACTED_EMAIL",
      45,
      "(Email — fără răspuns)",
      "1zi",
    ],
    [
      "SC AgroTech Dunărea",
      "Vasile Iordache",
      "0241998877",
      "WA",
      "COLD",
      0,
      "(Necontactat)",
      "—",
    ],
    [
      "Ion Popescu PFA",
      "Ion Popescu",
      "0740123456",
      "WA",
      "CONTACTED_WA",
      30,
      "Am primit mesajul...",
      "6h",
    ],
  ];
  const stages = [
    "ALL",
    "COLD",
    "CONTACTED_WA",
    "CONTACTED_EMAIL",
    "WARM_REPLY",
    "NEGOTIATION",
    "CONVERTED",
  ];
  const fr = filter === "ALL" ? rows : rows.filter((r) => r[4] === filter);
  return (
    <>
      <PH
        title="Lead-uri Outreach"
        sub={`${rows.length} leads active`}
        actions={
          <>
            <button className="btn bto bsm">
              <Ic p={I.upload} size={12} />
              Import
            </button>
            <button
              className="btn btp bsm"
              onClick={() =>
                toast.add({ type: "success", title: "Leads asignate" })
              }
            >
              <Ic p={I.send} size={12} />
              Asignează
            </button>
          </>
        }
      />
      <div className="tabs">
        {stages.map((s) => (
          <button
            key={s}
            className={`tab${filter === s ? " act" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "ALL" ? "Toate" : <SBadge status={s} />}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Companie</th>
                <th>Contact</th>
                <th>Canal</th>
                <th>Stadiu</th>
                <th>Sentiment</th>
                <th>Ultimul Mesaj</th>
                <th>Timp</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fr.map(([nm, ct, tel, ch, st, sent, msg, ago], i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{nm}</td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{ct}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--t4)",
                        fontFamily: "var(--fM)",
                      }}
                    >
                      {tel}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${ch === "WA" ? "bok" : "bin"}`}>
                      {ch === "WA" ? "WhatsApp" : "Email"}
                    </span>
                  </td>
                  <td>
                    <SBadge status={st} />
                  </td>
                  <td>
                    {sent > 0 ? (
                      <div className="flex ac g2">
                        <div className="pt" style={{ width: 50 }}>
                          <div
                            className="pf"
                            style={{
                              width: `${sent}%`,
                              background:
                                sent > 60
                                  ? "var(--ok)"
                                  : sent > 30
                                    ? "var(--wa)"
                                    : "var(--er)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontFamily: "var(--fM)" }}>
                          {sent}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--t4)" }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      color: "var(--t3)",
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {msg}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontSize: 12,
                      color: "var(--t4)",
                    }}
                  >
                    {ago}
                  </td>
                  <td>
                    <button
                      className="btn btg bsm"
                      onClick={() => toast.add({ type: "info", title: nm })}
                    >
                      <Ic p={I.msg} size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Seqs({ toast }) {
  const seqs = [
    {
      name: "Agricultori Ialomița Q1",
      steps: [
        { ch: "WA", d: 0 },
        { ch: "WA", d: 48 },
        { ch: "EMAIL", d: 96 },
        { ch: "WA", d: 168 },
      ],
      leads: 287,
      rate: 14.2,
      conv: 8,
      active: true,
    },
    {
      name: "Cooperative Sud România",
      steps: [
        { ch: "EMAIL", d: 0 },
        { ch: "WA", d: 72 },
        { ch: "EMAIL", d: 144 },
      ],
      leads: 134,
      rate: 18.7,
      conv: 12,
      active: true,
    },
    {
      name: "OUAI Irigații",
      steps: [
        { ch: "WA", d: 0 },
        { ch: "EMAIL", d: 48 },
        { ch: "WA", d: 120 },
        { ch: "EMAIL", d: 192 },
        { ch: "WA", d: 264 },
      ],
      leads: 47,
      rate: 21.3,
      conv: 5,
      active: false,
    },
  ];
  return (
    <>
      <PH
        title="Secvențe Outreach"
        sub="Multi-step · WhatsApp + Email"
        actions={
          <button className="btn btp bsm">
            <Ic p={I.plus} size={12} />
            Secvență Nouă
          </button>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {seqs.map((s, i) => (
          <div key={i} className="card">
            <div className="cb" style={{ padding: "16px 20px" }}>
              <div className="flex as jb">
                <div className="f1">
                  <div className="flex ac g3" style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        fontFamily: "var(--fD)",
                        color: "var(--t1)",
                      }}
                    >
                      {s.name}
                    </span>
                    <span className={`badge ${s.active ? "bok" : "bnt"}`}>
                      {s.active ? "Activ" : "Pauză"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    {s.steps.map((step, j) => (
                      <div
                        key={j}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {j > 0 && (
                          <span style={{ color: "var(--t4)", fontSize: 11 }}>
                            +{step.d}h →
                          </span>
                        )}
                        <span
                          className={`badge ${step.ch === "WA" ? "bok" : "bin"}`}
                        >
                          {step.ch === "WA" ? "WhatsApp" : "Email"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex g6">
                    {[
                      ["Leads", s.leads],
                      ["Rată Răspuns", s.rate + "%"],
                      ["Conversii", s.conv],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--t4)",
                            textTransform: "uppercase",
                            letterSpacing: ".07em",
                            marginBottom: 2,
                          }}
                        >
                          {k}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            fontFamily: "var(--fD)",
                            color: "var(--t1)",
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex g2">
                  <button
                    className="btn bto bsm"
                    onClick={() =>
                      toast.add({
                        type: "info",
                        title: `${s.active ? "Pauzată" : "Activată"}`,
                      })
                    }
                  >
                    {s.active ? "Pauză" : "Activează"}
                  </button>
                  <button className="btn btg bsm">
                    <Ic p={I.edit} size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Templates({ toast }) {
  const [sel, setSel] = useState(0);
  const tpls = [
    {
      name: "Intro WA Agricultori",
      ch: "WA",
      used: 1240,
      body: "Bună ziua {firstName}! 👋\n\nMă numesc Alex de la Cerniq.app. Văd că administrați {farmName} în {county}.\n\nAm un produs care poate reduce costurile cu inputuri cu 15-25%.\n\nVă pot trimite detalii?\n\n✅ Garanție returnare bani 30 zile",
      vars: ["{firstName}", "{county}", "{farmName}"],
    },
    {
      name: "Follow-up Email",
      ch: "EMAIL",
      used: 560,
      body: "Bună ziua {firstName},\n\nAm trimis un mesaj WA privind reducerea costurilor agricole.\n\nPentru o fermă din {county}, estimăm:\n• Economie: €{avgSaving}/an\n• Implementare: 2 săptămâni\n\nUn apel de 15 minute?",
      vars: ["{firstName}", "{county}", "{avgSaving}"],
    },
    {
      name: "Warm Lead — Proformă",
      ch: "WA",
      used: 234,
      body: "Bună {firstName}! Mulțumesc că ați răspuns 🙏\n\nPentru {farmSize} ha:\n💰 Economie: €{estimatedSaving}/an\n📦 Livrare: 5 zile\n🔒 e-Factura SPV\n\nVreau să vă trimit o proformă?",
      vars: ["{firstName}", "{farmSize}", "{estimatedSaving}"],
    },
  ];
  return (
    <>
      <PH
        title="Șabloane Mesaje"
        sub="Spintax · Variabile dinamice · A/B testing"
        actions={
          <button className="btn btp bsm">
            <Ic p={I.plus} size={12} />
            Șablon Nou
          </button>
        }
      />
      <div className="g2c">
        <div className="card">
          <div className="ch">
            <span className="ct">Bibliotecă</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {tpls.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  background:
                    sel === i ? "oklch(.70 .18 72/8%)" : "transparent",
                  borderLeft:
                    sel === i ? "3px solid var(--b5)" : "3px solid transparent",
                  transition: "all .1s",
                }}
                onClick={() => setSel(i)}
              >
                <p
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}
                >
                  {t.name}
                </p>
                <div className="flex g2" style={{ marginTop: 4 }}>
                  <span className={`badge ${t.ch === "WA" ? "bok" : "bin"}`}>
                    {t.ch}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--t4)" }}>
                    {t.used} utilizări
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <span className="ct">Preview: {tpls[sel].name}</span>
            <button
              className="btn bto bsm"
              onClick={() => toast.add({ type: "success", title: "Salvat" })}
            >
              <Ic p={I.edit} size={12} />
              Edit
            </button>
          </div>
          <div className="cb">
            <div
              style={{
                background: "oklch(.10 .018 255)",
                borderRadius: 8,
                padding: 16,
                fontFamily: "var(--fM)",
                fontSize: 12.5,
                color: "var(--t2)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                border: "1px solid oklch(.20 .018 255)",
              }}
            >
              {tpls[sel].body}
            </div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 11.5, color: "var(--t3)" }}>
                Variabile:
              </span>
              {tpls[sel].vars.map((v) => (
                <span key={v} className="badge bbd">
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Phones({ toast }) {
  const phones = [...Array(20)].map((_, i) => ({
    id: i + 1,
    used: 20 + Math.floor(Math.sin(i * 1.7 + 1) * 30 + 60),
    status: i === 3 ? "OFFLINE" : i === 7 ? "BANNED" : "ACTIVE",
  }));
  return (
    <>
      <PH
        title="Telefoane WhatsApp"
        sub="20 numere · TimelinesAI · 4,000 msg/zi max"
        actions={
          <button
            className="btn bto bsm"
            onClick={() =>
              toast.add({ type: "success", title: "Cote resetate" })
            }
          >
            Reset Cote
          </button>
        }
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="Active"
          value={`${phones.filter((p) => p.status === "ACTIVE").length}/20`}
          icon="phone"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
        />
        <Kpi
          label="Mesaje Azi"
          value={phones.reduce((s, p) => s + p.used, 0).toLocaleString()}
          icon="msg"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
        />
        <Kpi
          label="Cotă Disponibilă"
          value={(
            4000 - phones.reduce((s, p) => s + p.used, 0)
          ).toLocaleString()}
          icon="activity"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 10,
        }}
      >
        {phones.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              borderColor:
                p.status !== "ACTIVE"
                  ? "oklch(.58 .24 27/40%)"
                  : "oklch(.22 .018 255/60%)",
              cursor: "pointer",
            }}
            onClick={() =>
              toast.add({
                type: p.status === "ACTIVE" ? "info" : "error",
                title: `WA-${String(p.id).padStart(2, "0")} · ${p.status}`,
                desc: `${p.used}/200`,
              })
            }
          >
            <div className="cb" style={{ padding: "12px 14px" }}>
              <div className="flex ac jb" style={{ marginBottom: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--fM)",
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  WA-{String(p.id).padStart(2, "0")}
                </span>
                <span
                  className={`dot d${p.status === "ACTIVE" ? "ok" : "er"}`}
                />
              </div>
              <div className="pt" style={{ marginBottom: 6 }}>
                <div
                  className="pf"
                  style={{
                    width: `${(p.used / 200) * 100}%`,
                    background:
                      p.status !== "ACTIVE"
                        ? "var(--er)"
                        : p.used / 200 > 0.9
                          ? "var(--wa)"
                          : "var(--ok)",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--t4)",
                  fontFamily: "var(--fM)",
                }}
              >
                {p.used}/200
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Review({ toast }) {
  const [items, setItems] = useState([
    {
      id: 1,
      co: "SC Ferma Dunărea SA",
      ch: "WA",
      msg: "Înțeleg că prețul pare mare. Pot oferi un discount de 12% dacă comanda depășește €5,000.",
      reason: "Discount 12% propus — pragul automat: 10%",
    },
    {
      id: 2,
      co: "OUAI Ialomița Nord",
      ch: "EMAIL",
      msg: "Pot programa o vizită de demonstrație la sediul OUAI din Slobozia în data de 28 Februarie.",
      reason: "Programare vizită — confirmare disponibilitate agent",
    },
    {
      id: 3,
      co: "Cooperativa Agriland",
      ch: "WA",
      msg: "Da, avem produsul disponibil în stoc. Cantitatea minimă este 500kg, termen 3 zile lucrătoare.",
      reason: "Confirmare stoc — verificați cu ERP înainte de trimitere",
    },
  ]);
  return (
    <>
      <PH
        title="Review Queue"
        sub="Mesaje AI necesită aprobare umană"
        badge={{ c: "ber", l: `${items.length} pending` }}
      />
      <EB
        num="2"
        name="Human Review Queue"
        msg="AI-ul a generat răspunsuri ce depășesc pragurile automate de discount, vizite sau confirmare stoc."
        type="info"
      />
      {items.length === 0 ? (
        <div className="emp">
          <div className="epi">
            <Ic p={I.check} size={22} />
          </div>
          <p className="ept">Queue gol!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((x) => (
            <div key={x.id} className="card">
              <div className="ch">
                <div className="flex ac g3">
                  <span style={{ fontWeight: 700 }}>{x.co}</span>
                  <span className={`badge ${x.ch === "WA" ? "bok" : "bin"}`}>
                    {x.ch}
                  </span>
                  <span className="badge bwa">Review Required</span>
                </div>
              </div>
              <div className="cb">
                <div
                  className="mai"
                  style={{
                    borderRadius: 10,
                    maxWidth: "none",
                    marginBottom: 12,
                    padding: "10px 14px",
                  }}
                >
                  {x.msg}
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    background: "oklch(.72 .19 70/8%)",
                    borderRadius: 8,
                    border: "1px solid oklch(.72 .19 70/20%)",
                    marginBottom: 12,
                  }}
                >
                  <p style={{ fontSize: 12, color: "var(--wa)" }}>
                    ⚠ {x.reason}
                  </p>
                </div>
                <div className="flex g2">
                  <button
                    className="btn btok bsm"
                    onClick={() => {
                      setItems((p) => p.filter((i) => i.id !== x.id));
                      toast.add({
                        type: "success",
                        title: "Trimis",
                        desc: x.co,
                      });
                    }}
                  >
                    <Ic p={I.check} size={13} />
                    Aprobă & Trimite
                  </button>
                  <button
                    className="btn bto bsm"
                    onClick={() =>
                      toast.add({ type: "info", title: "Editor deschis" })
                    }
                  >
                    <Ic p={I.edit} size={13} />
                    Edit
                  </button>
                  <button
                    className="btn btd bsm"
                    onClick={() => {
                      setItems((p) => p.filter((i) => i.id !== x.id));
                      toast.add({ type: "info", title: "Respins" });
                    }}
                  >
                    <Ic p={I.xmark} size={13} />
                    Respinge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AiDash({ setPage, toast }) {
  return (
    <>
      <PH
        title="AI Sales Agent Dashboard"
        sub="Paradigma Neuro-Simbolică · Zero Hallucinations"
        badge={{ c: "bbd", l: "xAI Grok" }}
        actions={
          <button className="btn btb bsm" onClick={() => setPage("negs")}>
            <Ic p={I.sparkle} size={12} />
            Negocieri
          </button>
        }
      />
      <EB
        num="3"
        name="AI Sales Agent"
        msg="Agentul AI orchestrează negocieri complete: de la primul contact la emiterea facturii fiscale. Guardrails simbolici previn hallucinations."
      />
      <div className="kg">
        <Kpi
          label="Negocieri Active"
          value="47"
          icon="msg"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
          change="+5 azi"
          ctype="up"
          onClick={() => setPage("negs")}
        />
        <Kpi
          label="Oferte Generate"
          value="23"
          icon="doc"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
          change="8 acceptate"
          ctype="up"
          onClick={() => setPage("offers")}
        />
        <Kpi
          label="Facturi Emise"
          value="89"
          icon="dollar"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="€184K"
          ctype="up"
          onClick={() => setPage("invoices")}
        />
        <Kpi
          label="Guardrail Blocks"
          value="3"
          icon="shield"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
          onClick={() => setPage("guards")}
        />
      </div>
      <div className="g3c">
        <div className="card">
          <div className="ch">
            <span className="ct">State Machine</span>
          </div>
          <div className="cb">
            {[
              ["DISCOVERY", 12, "in"],
              ["PROPOSAL", 15, "bbd"],
              ["OBJECTION", 8, "wa"],
              ["CLOSING", 7, "ok"],
              ["WON", 5, "ok"],
            ].map(([s, n, c]) => (
              <div key={s} className="sbr">
                <span style={{ width: 110, flexShrink: 0, fontSize: 10.5 }}>
                  <span className={`badge b${c}`}>{s}</span>
                </span>
                <div className="sbt">
                  <div
                    className="sbf"
                    style={{
                      width: `${(n / 15) * 100}%`,
                      background:
                        c === "bbd"
                          ? "var(--b4)"
                          : c === "wa"
                            ? "var(--wa)"
                            : c === "ok"
                              ? "var(--ok)"
                              : "var(--in)",
                    }}
                  />
                </div>
                <span className="sbc">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <span className="ct">LLM Routing</span>
          </div>
          <div className="cb">
            {[
              ["xAI Grok", "€0.84", "74%", "b5"],
              ["Claude Haiku", "€0.12", "18%", "in"],
              ["GPT-4o Mini", "€0.08", "8%", "t4"],
            ].map(([m, c, p, cl]) => (
              <div key={m} style={{ marginBottom: 12 }}>
                <div className="flex jb" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--t2)" }}>{m}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--fM)",
                      fontWeight: 700,
                    }}
                  >
                    {c}
                  </span>
                </div>
                <div className="pt">
                  <div
                    className="pf"
                    style={{
                      width: p,
                      background:
                        cl === "b5"
                          ? "var(--b5)"
                          : cl === "in"
                            ? "var(--in)"
                            : "var(--t4)",
                    }}
                  />
                </div>
              </div>
            ))}
            <p
              style={{
                fontSize: 11,
                color: "var(--t4)",
                borderTop: "1px solid oklch(.20 .018 255/40%)",
                paddingTop: 10,
              }}
            >
              Cost azi:{" "}
              <strong style={{ color: "var(--t1)", fontFamily: "var(--fM)" }}>
                €1.04 / limit €5.00
              </strong>
            </p>
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <span className="ct">Guardrails</span>
          </div>
          <div className="cb">
            {[
              ["Validare Preț/SKU", "ok", "All pass"],
              ["Verificare Stoc", "ok", "Live ERP"],
              ["Discount Approval", "wa", "2 depășiri"],
              ["e-Factura Deadline", "ok", "5 zile ok"],
              ["Anti-Hallucination", "ok", "0 blocked"],
            ].map(([n, s, d]) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom: "1px solid oklch(.18 .018 255/40%)",
                }}
              >
                <span className={`dot d${s}`} />
                <span style={{ fontSize: 12.5, flex: 1 }}>{n}</span>
                <span
                  style={{
                    fontSize: 11.5,
                    color: `var(--${s === "ok" ? "ok" : "wa"})`,
                  }}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Negs({ toast }) {
  const [active, setActive] = useState(null);
  const negs = [
    {
      co: "SC Ferma Dunărea SA",
      ct: "Elena Dumitrescu",
      state: "CLOSING",
      val: "€12,400",
      disc: "8%",
      msgs: 7,
      sent: 85,
    },
    {
      co: "Cooperativa Agriland",
      ct: "Marin Popa",
      state: "OBJECTION_HANDLING",
      val: "€8,200",
      disc: "5%",
      msgs: 12,
      sent: 72,
    },
    {
      co: "OUAI Ialomița Nord",
      ct: "Ion Stroe",
      state: "PROPOSAL",
      val: "€5,600",
      disc: "0%",
      msgs: 4,
      sent: 68,
    },
    {
      co: "SC AgroTech Dunărea",
      ct: "Vasile Iordache",
      state: "DISCOVERY",
      val: "TBD",
      disc: "—",
      msgs: 2,
      sent: 55,
    },
  ];
  const CONV = [
    {
      side: "out",
      text: "Bună ziua Elena! Mulțumesc că ați răspuns. Cum vă pot ajuta?",
    },
    {
      side: "in",
      text: "Suntem interesați de produse pentru protecția culturilor. Avem 450 ha porumb.",
    },
    {
      side: "ai",
      text: "Excelent! Pentru 450 ha porumb, recomand Pachetul Agricultori Pro:\n• Fungicid Sistemic X200 — 4.5L/ha\n• Insecticid Broadband — 0.3L/ha\nEstimare: €11,800 ✓ Stoc disponibil",
    },
    { side: "in", text: "Prețul pare un pic mare. Puteți oferi un discount?" },
    {
      side: "ai",
      text: "Pot aproba 8% pentru comenzi >€10,000 → total €10,856 cu livrare gratuită. Generez proforma?",
    },
    { side: "in", text: "Da, vă rog trimiteți proforma!" },
    {
      side: "sys",
      text: "✓ Guardrail PASS: Discount 8% ≤ 10% · Proforma P2026-0089 generată",
    },
  ];
  if (active !== null) {
    const n = negs[active];
    return (
      <>
        <div className="flex ac g3" style={{ marginBottom: 20 }}>
          <button className="btn btg bsm" onClick={() => setActive(null)}>
            <Ic p={I.chevL} size={13} />
            Înapoi
          </button>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: "var(--fD)",
              color: "var(--t1)",
            }}
          >
            {n.co}
          </span>
          <SBadge status={n.state} />
        </div>
        <div className="g2c">
          <div className="card">
            <div className="ch">
              <span className="ct">Conversație AI</span>
              <span className="badge bbd">
                <Ic p={I.sparkle} size={10} />
                AI Active
              </span>
            </div>
            <div
              className="cb"
              style={{
                height: 360,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {CONV.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent:
                      m.side === "in"
                        ? "flex-start"
                        : m.side === "sys"
                          ? "center"
                          : "flex-end",
                    marginBottom: 8,
                  }}
                >
                  <div
                    className={`mb ${m.side === "out" ? "mo" : m.side === "ai" ? "mai" : m.side === "sys" ? "ms" : "mi"}`}
                    style={{ whiteSpace: "pre-wrap", maxWidth: "75%" }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid oklch(.20 .018 255/40%)",
              }}
            >
              <div className="flex g2">
                <input
                  className="inp f1"
                  placeholder="Sau lăsați AI-ul să continue..."
                />
                <button
                  className="btn btp bsm"
                  onClick={() =>
                    toast.add({
                      type: "info",
                      title: "AI răspunde",
                      desc: "Guardrails active",
                    })
                  }
                >
                  <Ic p={I.sparkle} size={13} />
                </button>
                <button className="btn bto bsm">
                  <Ic p={I.send} size={13} />
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card">
              <div className="ch">
                <span className="ct">Detalii</span>
              </div>
              <div className="cb">
                {[
                  ["Stadiu", <SBadge status={n.state} />],
                  [
                    "Valoare",
                    <span
                      style={{
                        fontFamily: "var(--fM)",
                        color: "var(--ok)",
                        fontWeight: 700,
                      }}
                    >
                      {n.val}
                    </span>,
                  ],
                  ["Discount", n.disc],
                  ["Contact", n.ct],
                  ["Mesaje", n.msgs],
                  [
                    "Sentiment",
                    <span
                      style={{ color: n.sent > 70 ? "var(--ok)" : "var(--wa)" }}
                    >
                      {n.sent}/100
                    </span>,
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "7px 0",
                      borderBottom: "1px solid oklch(.18 .018 255/40%)",
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: "var(--t3)" }}>
                      {k}
                    </span>
                    <span style={{ fontSize: 12.5 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="ch">
                <span className="ct">Acțiuni</span>
              </div>
              <div
                className="cb"
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <button
                  className="btn btb wf"
                  onClick={() =>
                    toast.add({
                      type: "success",
                      title: "Proformă trimisă P2026-0089",
                    })
                  }
                >
                  <Ic p={I.doc} size={14} />
                  Generează Proformă
                </button>
                <button
                  className="btn bto wf"
                  onClick={() =>
                    toast.add({ type: "info", title: "Discount solicitat" })
                  }
                >
                  <Ic p={I.dollar} size={14} />
                  Solicită Discount
                </button>
                <button
                  className="btn btok wf"
                  onClick={() =>
                    toast.add({ type: "success", title: "Negociere WON! 🎉" })
                  }
                >
                  <Ic p={I.check} size={14} />
                  Marchează WON
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <PH
        title="Negocieri Active"
        sub="AI Sales Agent · State Machine"
        badge={{ c: "bin", l: `${negs.length} active` }}
        actions={
          <button
            className="btn btp bsm"
            onClick={() => toast.add({ type: "info", title: "Negociere nouă" })}
          >
            <Ic p={I.plus} size={12} />
            Nouă
          </button>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {negs.map((n, i) => (
          <div
            key={i}
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => setActive(i)}
          >
            <div className="cb" style={{ padding: "14px 18px" }}>
              <div className="flex ac g4">
                <div
                  className="av"
                  style={{ width: 38, height: 38, fontSize: 14 }}
                >
                  {n.co.charAt(0)}
                </div>
                <div className="f1 mw0">
                  <div className="flex ac g3" style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--t1)",
                        fontSize: 14,
                      }}
                    >
                      {n.co}
                    </span>
                    <SBadge status={n.state} />
                    <span className="badge bbd">
                      <Ic p={I.sparkle} size={9} />
                      AI
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--t3)" }}>
                    {n.ct} · {n.msgs} mesaje
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 800,
                      color: "var(--ok)",
                      fontSize: 15,
                    }}
                  >
                    {n.val}
                  </div>
                </div>
                <Ic p={I.chevR} size={14} s="var(--t4)" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Offers({ toast }) {
  const rows = [
    [
      "P2026-0089",
      "SC Ferma Dunărea SA",
      "€10,856",
      3,
      "8%",
      "SENT",
      "21 Feb 2026",
      "28 Feb 2026",
    ],
    [
      "P2026-0088",
      "Cooperativa Agriland",
      "€7,790",
      4,
      "5%",
      "DRAFT",
      "21 Feb 2026",
      "28 Feb 2026",
    ],
    [
      "P2026-0087",
      "SC AgroSud SRL",
      "€4,200",
      2,
      "0%",
      "DELIVERED",
      "19 Feb 2026",
      "26 Feb 2026",
    ],
    [
      "P2026-0085",
      "OUAI Ialomița Nord",
      "€5,320",
      5,
      "0%",
      "PAID",
      "17 Feb 2026",
      "24 Feb 2026",
    ],
  ];
  return (
    <>
      <PH
        title="Oferte & Proforma"
        sub="Generate de AI · e-Factura ready"
        actions={
          <>
            <button className="btn bto bsm">
              <Ic p={I.filter} size={12} />
              Filtre
            </button>
            <button
              className="btn btp bsm"
              onClick={() =>
                toast.add({
                  type: "success",
                  title: "Proformă nouă P2026-0090",
                })
              }
            >
              <Ic p={I.sparkle} size={12} />
              Generează
            </button>
          </>
        }
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="Draft"
          value="4"
          icon="doc"
          color="var(--t3)"
          bg="oklch(.18 .018 255)"
        />
        <Kpi
          label="Trimise/Active"
          value="8"
          icon="send"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
          change="2 acceptate"
          ctype="up"
        />
        <Kpi
          label="Plătite Luna"
          value="€41,200"
          icon="dollar"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Proforma & Oferte</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Client</th>
                <th>Valoare</th>
                <th>Produse</th>
                <th>Discount</th>
                <th>Status</th>
                <th>Data</th>
                <th>Valabilă</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([id, co, val, items, disc, st, dt, vd], i) => (
                <tr key={i}>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 700,
                      color: "var(--b3)",
                    }}
                  >
                    {id}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{co}</td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      color: "var(--ok)",
                      fontWeight: 700,
                    }}
                  >
                    {val}
                  </td>
                  <td style={{ textAlign: "center" }}>{items}</td>
                  <td style={{ fontFamily: "var(--fM)" }}>{disc}</td>
                  <td>
                    <SBadge status={st} />
                  </td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {dt}
                  </td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {vd}
                  </td>
                  <td>
                    <div className="flex g1">
                      <button
                        className="btn btg bsm"
                        onClick={() =>
                          toast.add({ type: "info", title: `${id} deschis` })
                        }
                      >
                        <Ic p={I.doc} size={12} />
                      </button>
                      <button
                        className="btn btg bsm"
                        onClick={() =>
                          toast.add({ type: "success", title: `${id} trimis` })
                        }
                      >
                        <Ic p={I.send} size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Invoices({ toast }) {
  const rows = [
    [
      "F2026-0234",
      "SC Ferma Dunărea SA",
      "€10,856",
      "€2,605",
      "€13,461",
      "OK",
      "PAID",
      "20 Feb 2026",
    ],
    [
      "F2026-0233",
      "OUAI Ialomița Nord",
      "€5,320",
      "€1,277",
      "€6,597",
      "PENDING",
      "DELIVERED",
      "19 Feb 2026",
    ],
    [
      "F2026-0231",
      "SC AgroSud SRL",
      "€4,200",
      "€1,008",
      "€5,208",
      "OK",
      "OVERDUE",
      "10 Feb 2026",
    ],
    [
      "F2026-0228",
      "Cooperativa Agriland",
      "€7,100",
      "€1,704",
      "€8,804",
      "OK",
      "PAID",
      "8 Feb 2026",
    ],
  ];
  return (
    <>
      <PH
        title="Facturi & e-Factura"
        sub="Oblio.eu · SPV ANAF · 5 zile termen legal"
        actions={
          <>
            <button
              className="btn bto bsm"
              onClick={() =>
                toast.add({ type: "success", title: "Sync SPV completat" })
              }
            >
              <Ic p={I.refresh} size={12} />
              Sync SPV
            </button>
            <button className="btn btp bsm">
              <Ic p={I.plus} size={12} />
              Factură Nouă
            </button>
          </>
        }
      />
      <div className="kg">
        <Kpi
          label="Total Luna"
          value="€184,200"
          icon="dollar"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="+18%"
          ctype="up"
        />
        <Kpi
          label="e-Factura SPV"
          value="89/92"
          icon="shield"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
          change="3 pending"
        />
        <Kpi
          label="Restanțe"
          value="€5,208"
          icon="warning"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
          ctype="warn"
        />
        <Kpi
          label="TVA Luna"
          value="€44,208"
          icon="credit"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Registru Facturi</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nr. Factură</th>
                <th>Client</th>
                <th>Valoare</th>
                <th>TVA 24%</th>
                <th>Total</th>
                <th>SPV</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([id, co, val, vat, tot, spv, st, dt], i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      st === "OVERDUE" ? "oklch(.58 .24 27/5%)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 700,
                      color: "var(--b3)",
                    }}
                  >
                    {id}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{co}</td>
                  <td style={{ fontFamily: "var(--fM)" }}>{val}</td>
                  <td style={{ fontFamily: "var(--fM)", color: "var(--t3)" }}>
                    {vat}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 700,
                      color: "var(--ok)",
                    }}
                  >
                    {tot}
                  </td>
                  <td>
                    <span className={`badge ${spv === "OK" ? "bok" : "bwa"}`}>
                      {spv === "OK" ? "✓ SPV" : "⏳ Pending"}
                    </span>
                  </td>
                  <td>
                    <SBadge status={st} />
                  </td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {dt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Guards() {
  const logs = [
    [
      "14:32",
      "PRICE_GUARD",
      "AI propunea discount 18%",
      "BLOCKED — Limită: 10%",
      "BLOCKED",
    ],
    [
      "12:15",
      "STOCK_GUARD",
      "Confirmare stoc 823kg X200",
      "PASS — Stoc real: 823kg ✓",
      "PASS",
    ],
    [
      "11:45",
      "SKU_GUARD",
      "AI a inventat SKU-8821",
      "BLOCKED — SKU inexistent în DB",
      "BLOCKED",
    ],
    [
      "09:22",
      "FISCAL_GUARD",
      "CUI RO99887766 pre-factură",
      "PASS — ANAF confirmă activ ✓",
      "PASS",
    ],
  ];
  return (
    <>
      <PH
        title="Guardrails AI"
        sub="Paradigma Neuro-Simbolică · Zero Hallucinations"
        badge={{ c: "bok", l: "0 hallucinations azi" }}
      />
      <EB
        num="3"
        name="Anti-Hallucination System"
        msg="Guardrails simbolici verifică: prețuri DB, stoc live ERP, SKU-uri existente, CUI ANAF. Niciun mesaj fals nu ajunge la client."
        type="ok"
      />
      <div className="kg">
        {[
          ["Price Guard", "PASS", "ok", "0 violări"],
          ["Stock Guard", "PASS", "ok", "Sync 5 min"],
          ["SKU Guard", "2 BLOCKED", "wa", "Regenerat"],
          ["Fiscal Guard", "PASS", "ok", "ANAF live"],
        ].map(([n, s, c, d]) => (
          <div key={n} className="kc">
            <div className="flex ac jb" style={{ marginBottom: 10 }}>
              <span className="sl">{n}</span>
              <span className={`dot d${c}`} />
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "var(--fD)",
                color: `var(--${c})`,
                marginBottom: 6,
              }}
            >
              {s}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{d}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Audit Log Guardrails</span>
          <span style={{ fontSize: 11, color: "var(--t3)" }}>Ultimele 24h</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Timp</th>
                <th>Tip Guard</th>
                <th>Input AI</th>
                <th>Rezultat</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(([t, tp, inp, out, st], i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>{t}</td>
                  <td>
                    <span className="badge bin">{tp}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{inp}</td>
                  <td
                    style={{
                      fontSize: 12,
                      color: st === "PASS" ? "var(--ok)" : "var(--wa)",
                    }}
                  >
                    {out}
                  </td>
                  <td>
                    <span className={`badge ${st === "PASS" ? "bok" : "bwa"}`}>
                      {st}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Payments({ toast }) {
  const rows = [
    [
      "21 Feb 14:23",
      "REV-A8B3C9D2",
      "SC Ferma Dunărea SA",
      "+€13,461",
      "RON",
      "F2026-0234",
      "PAYMENT",
      "MATCHED",
    ],
    [
      "21 Feb 11:45",
      "REV-F7E2A1B8",
      "Cooperativa Agriland",
      "+€8,804",
      "EUR",
      "F2026-0228",
      "PAYMENT",
      "MATCHED",
    ],
    [
      "20 Feb 16:30",
      "REV-D4C5B6A7",
      "—",
      "+€1,240",
      "RON",
      "—",
      "UNKNOWN",
      "UNMATCHED",
    ],
    [
      "19 Feb 09:12",
      "REV-A2B3C4D5",
      "SC AgroSud SRL",
      "-€345",
      "EUR",
      "RETUR-0012",
      "REFUND",
      "MATCHED",
    ],
  ];
  return (
    <>
      <PH
        title="Plăți Revolut"
        sub="Reconciliere automată · Webhooks real-time"
        actions={
          <button
            className="btn bto bsm"
            onClick={() =>
              toast.add({ type: "success", title: "Sync Revolut completat" })
            }
          >
            <Ic p={I.refresh} size={12} />
            Sync
          </button>
        }
      />
      <EB
        num="4"
        name="Flux Cash Event-Driven"
        msg="Webhooks Revolut → reconciliere factură → deblocare livrare → actualizare sold. Timp mediu: 8 secunde."
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="Încasări Luna"
          value="€184,200"
          icon="dollar"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="+18%"
          ctype="up"
        />
        <Kpi
          label="Nereconciliate"
          value="€1,240"
          icon="warning"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
          ctype="warn"
        />
        <Kpi
          label="Restanțe"
          value="€5,208"
          icon="credit"
          color="var(--er)"
          bg="oklch(.58 .24 27/12%)"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Tranzacții Revolut</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Referință</th>
                <th>Client</th>
                <th>Sumă</th>
                <th>Monedă</th>
                <th>Factură</th>
                <th>Tip</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([dt, ref, co, amt, cur, inv, tp, st], i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      st === "UNMATCHED"
                        ? "oklch(.72 .19 70/5%)"
                        : "transparent",
                  }}
                >
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {dt}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontSize: 11.5,
                      color: "var(--b3)",
                    }}
                  >
                    {ref}
                  </td>
                  <td style={{ fontWeight: 600 }}>{co}</td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 700,
                      color: amt.startsWith("+") ? "var(--ok)" : "var(--er)",
                    }}
                  >
                    {amt}
                  </td>
                  <td>
                    <span className="badge bnt">{cur}</span>
                  </td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {inv}
                  </td>
                  <td>
                    <span
                      className={`badge ${tp === "PAYMENT" ? "bok" : tp === "REFUND" ? "bwa" : "bnt"}`}
                    >
                      {tp}
                    </span>
                  </td>
                  <td>
                    <SBadge status={st} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Credit({ toast }) {
  const rows = [
    [
      "SC Ferma Dunărea SA",
      "RO55443322",
      892,
      "€50,000",
      "€13,461",
      "8 ani",
      "RISK_LOW",
    ],
    [
      "Cooperativa Agriland",
      "RO11223344",
      745,
      "€25,000",
      "€8,804",
      "3 ani",
      "RISK_LOW",
    ],
    [
      "OUAI Ialomița Nord",
      "RO77889900",
      612,
      "€15,000",
      "€6,597",
      "1 an",
      "RISK_MED",
    ],
    [
      "SC AgroSud SRL",
      "RO44556677",
      487,
      "€10,000",
      "€5,208",
      "2 ani",
      "RISK_HIGH",
    ],
  ];
  return (
    <>
      <PH
        title="Credit Scoring"
        sub="Termene.ro · Scorare automată · Limite dinamice"
        actions={
          <button
            className="btn bto bsm"
            onClick={() =>
              toast.add({ type: "success", title: "Scores actualizate" })
            }
          >
            <Ic p={I.refresh} size={12} />
            Refresh
          </button>
        }
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="Risc Scăzut"
          value="67%"
          icon="shield"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
        />
        <Kpi
          label="Risc Mediu"
          value="24%"
          icon="warning"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
        />
        <Kpi
          label="Risc Ridicat"
          value="9%"
          icon="flag"
          color="var(--er)"
          bg="oklch(.58 .24 27/12%)"
          ctype="warn"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Profiluri Credit</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>CUI</th>
                <th>Score</th>
                <th>Limită</th>
                <th>Utilizat</th>
                <th>Istoric</th>
                <th>Risc</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([nm, cui, sc, lim, used, hist, st], i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{nm}</td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {cui}
                  </td>
                  <td>
                    <div className="flex ac g2">
                      <div className="pt" style={{ width: 60 }}>
                        <div
                          className="pf"
                          style={{
                            width: `${sc / 10}%`,
                            background:
                              sc > 700
                                ? "var(--ok)"
                                : sc > 500
                                  ? "var(--wa)"
                                  : "var(--er)",
                          }}
                        />
                      </div>
                      <span
                        style={{ fontFamily: "var(--fM)", fontWeight: 700 }}
                      >
                        {sc}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      color: "var(--ok)",
                      fontWeight: 600,
                    }}
                  >
                    {lim}
                  </td>
                  <td style={{ fontFamily: "var(--fM)" }}>{used}</td>
                  <td style={{ fontSize: 12 }}>{hist}</td>
                  <td>
                    <SBadge status={st} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Logistics({ toast }) {
  const rows = [
    [
      "ENE324892RO",
      "SC Ferma Dunărea SA",
      "F2026-0234",
      "47 kg · 3 colete",
      "DELIVERED",
      "Brăila",
      "Livrat 20 Feb",
      false,
    ],
    [
      "ENE318745RO",
      "Cooperativa Agriland",
      "F2026-0228",
      "83 kg · 5 colete",
      "IN_TRANSIT",
      "Ialomița",
      "Azi 16:00",
      false,
    ],
    [
      "ENE312341RO",
      "OUAI Ialomița Nord",
      "F2026-0231",
      "34 kg · 2 colete",
      "PROCESSING",
      "Ialomița",
      "22 Feb",
      true,
    ],
  ];
  return (
    <>
      <PH
        title="Logistică AWB"
        sub="Sameday Courier · Tracking live"
        actions={
          <button
            className="btn btp bsm"
            onClick={() =>
              toast.add({ type: "success", title: "AWB generat ENE332891RO" })
            }
          >
            <Ic p={I.plus} size={12} />
            Generează AWB
          </button>
        }
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="În Tranzit"
          value="3"
          icon="truck"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
        />
        <Kpi
          label="Livrate Azi"
          value="8"
          icon="check"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="94%"
          ctype="up"
        />
        <Kpi
          label="COD Pending"
          value="€2,340"
          icon="dollar"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Expediții</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>AWB</th>
                <th>Client</th>
                <th>Comandă</th>
                <th>Colete</th>
                <th>Județ</th>
                <th>ETA</th>
                <th>COD</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([awb, co, ord, items, st, jud, eta, cod], i) => (
                <tr key={i}>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 700,
                      color: "var(--b3)",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      toast.add({
                        type: "info",
                        title: `Tracking ${awb}`,
                        desc: eta,
                      })
                    }
                  >
                    {awb}
                  </td>
                  <td style={{ fontWeight: 600 }}>{co}</td>
                  <td style={{ fontFamily: "var(--fM)", fontSize: 12 }}>
                    {ord}
                  </td>
                  <td style={{ fontSize: 12 }}>{items}</td>
                  <td>{jud}</td>
                  <td style={{ fontSize: 12, fontFamily: "var(--fM)" }}>
                    {eta}
                  </td>
                  <td>{cod ? <span className="badge bwa">COD</span> : "—"}</td>
                  <td>
                    <SBadge status={st} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Returns({ toast }) {
  const [items, setItems] = useState([
    {
      id: "RMA-0012",
      co: "SC AgroSud SRL",
      reason: "Produs deteriorat în transport",
      val: "€345",
      st: "PROCESSING",
      dt: "15 Feb",
    },
    {
      id: "RMA-0011",
      co: "Ion Popescu PFA",
      reason: "Produs incorect livrat",
      val: "€128",
      st: "PENDING",
      dt: "18 Feb",
    },
  ]);
  return (
    <>
      <PH
        title="Retururi RMA"
        sub="Return Merchandise Authorization"
        actions={
          <button className="btn btp bsm">
            <Ic p={I.plus} size={12} />
            RMA Nou
          </button>
        }
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="RMA Deschise"
          value={`${items.length}`}
          icon="refresh"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
        />
        <Kpi
          label="Procesate Luna"
          value="7"
          icon="check"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="2.3% rată"
        />
        <Kpi
          label="Valoare Returnată"
          value="€3,450"
          icon="dollar"
          color="var(--er)"
          bg="oklch(.58 .24 27/12%)"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">RMA Active</span>
        </div>
        <div className="cb">
          {items.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "14px 0",
                borderBottom:
                  i < items.length - 1
                    ? "1px solid oklch(.20 .018 255/40%)"
                    : "none",
              }}
            >
              <div className="flex as jb">
                <div>
                  <div className="flex ac g3" style={{ marginBottom: 6 }}>
                    <span
                      style={{
                        fontFamily: "var(--fM)",
                        fontWeight: 700,
                        color: "var(--b3)",
                      }}
                    >
                      {r.id}
                    </span>
                    <SBadge status={r.st} />
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--t1)",
                    }}
                  >
                    {r.co}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--t3)", marginTop: 2 }}>
                    {r.reason}
                  </p>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--t4)",
                      fontFamily: "var(--fM)",
                      marginTop: 4,
                    }}
                  >
                    {r.dt}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--fM)",
                      fontWeight: 800,
                      color: "var(--er)",
                      fontSize: 16,
                    }}
                  >
                    {r.val}
                  </div>
                  <div className="flex g2" style={{ marginTop: 8 }}>
                    <button
                      className="btn btok bsm"
                      onClick={() => {
                        setItems((p) => p.filter((x) => x.id !== r.id));
                        toast.add({
                          type: "success",
                          title: `${r.id} aprobat`,
                        });
                      }}
                    >
                      Aprobă
                    </button>
                    <button className="btn bto bsm">Detalii</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Nurturing({ toast }) {
  const rows = [
    ["SC Ferma Dunărea SA", "LOYAL", 9, 12, "€38,400", 4, "14 Mar"],
    ["Cooperativa Agriland", "LOYAL", 8, 6, "€22,100", 12, "25 Feb"],
    ["OUAI Ialomița Nord", "AT_RISK", 6, 2, "€9,800", 67, "URGENT"],
    ["SC AgroSud SRL", "AT_RISK", 5, 3, "€11,200", 45, "22 Feb"],
  ];
  return (
    <>
      <PH
        title="Retenție Clienți"
        sub="Nurturing Agentic · CLTV · Churn prevention"
        actions={
          <button
            className="btn btp bsm"
            onClick={() =>
              toast.add({ type: "success", title: "Campanie lansată" })
            }
          >
            <Ic p={I.send} size={12} />
            Lansează Campanie
          </button>
        }
      />
      <EB
        num="5"
        name="Nurturing Agentic Ecosystem"
        msg="De la tranzacție la ecosistem relațional. CLTV maximizare, churn prevention, creștere virală prin referral și proximitate geografică."
      />
      <div className="kg">
        <Kpi
          label="Clienți Activi"
          value="125"
          icon="users"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="+8 luna"
          ctype="up"
        />
        <Kpi
          label="CLTV Mediu"
          value="€2,840"
          icon="dollar"
          color="oklch(.82 .18 82)"
          bg="oklch(.19 .07 80/35%)"
          change="+€220"
          ctype="up"
        />
        <Kpi
          label="NPS Mediu"
          value="7.8/10"
          icon="heart"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
          change="+0.4"
          ctype="up"
        />
        <Kpi
          label="Churn Rate"
          value="2.3%"
          icon="activity"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
          change="-0.4%"
          ctype="up"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Portofoliu Clienți</span>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Stare</th>
                <th>NPS</th>
                <th>Comenzi</th>
                <th>CLTV</th>
                <th>Risc Churn</th>
                <th>Următor Contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([nm, st, nps, ord, cltv, churn, nxt], i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--t1)" }}>{nm}</td>
                  <td>
                    <SBadge status={st} />
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "var(--fM)",
                        fontWeight: 700,
                        color:
                          nps >= 8
                            ? "var(--ok)"
                            : nps >= 6
                              ? "var(--wa)"
                              : "var(--er)",
                      }}
                    >
                      {nps}/10
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{ord}</td>
                  <td
                    style={{
                      fontFamily: "var(--fM)",
                      color: "var(--ok)",
                      fontWeight: 600,
                    }}
                  >
                    {cltv}
                  </td>
                  <td>
                    <div className="flex ac g2">
                      <div className="pt" style={{ width: 50 }}>
                        <div
                          className="pf"
                          style={{
                            width: `${churn}%`,
                            background:
                              churn > 50
                                ? "var(--er)"
                                : churn > 20
                                  ? "var(--wa)"
                                  : "var(--ok)",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontFamily: "var(--fM)" }}>
                        {churn}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--fM)",
                        color: nxt === "URGENT" ? "var(--er)" : "var(--t2)",
                        fontWeight: nxt === "URGENT" ? 700 : 400,
                      }}
                    >
                      {nxt}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Referrals({ toast }) {
  return (
    <>
      <PH
        title="Sistem Referrals"
        sub="KNN Geografic · KOL Targeting · Viralitate"
        actions={
          <button
            className="btn btp bsm"
            onClick={() =>
              toast.add({ type: "success", title: "Campanie referral lansată" })
            }
          >
            Lansează
          </button>
        }
      />
      <EB
        num="5"
        name="Referral & Expansion Engine"
        msg="Algoritm KNN geografic identifică fermieri vecini cu profilul clienților de succes. NetworkX detectează Key Opinion Leaders."
        type="ok"
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="Referrals Active"
          value="23"
          icon="gift"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
          change="+8"
          ctype="up"
        />
        <Kpi
          label="Clienți Noi"
          value="12"
          icon="users"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="52% conv."
          ctype="up"
        />
        <Kpi
          label="Economie CAC"
          value="€4,800"
          icon="dollar"
          color="oklch(.82 .18 82)"
          bg="oklch(.19 .07 80/35%)"
          change="-62%"
          ctype="up"
        />
      </div>
      <div className="g2c">
        <div className="card">
          <div className="ch">
            <span className="ct">Key Opinion Leaders</span>
          </div>
          <div className="cb">
            {[
              ["Gheorghe Marin", "Ialomița", "OUAI Nord", 94, 8],
              ["Elena Dumitrescu", "Brăila", "Fermieri Delta", 87, 6],
              ["Marin Popa", "Ialomița", "Cooperativa X", 72, 3],
            ].map(([nm, jud, cl, inf, refs], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom:
                    i < 2 ? "1px solid oklch(.20 .018 255/40%)" : "none",
                }}
              >
                <div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--t1)",
                    }}
                  >
                    {nm}
                  </p>
                  <p
                    style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}
                  >
                    {jud} · {cl}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: "var(--fD)",
                      color: "var(--b3)",
                    }}
                  >
                    Influență {inf}%
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}
                  >
                    {refs} referrals
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <span className="ct">Harta Proximitate KNN</span>
          </div>
          <div className="cb">
            <div
              style={{
                height: 200,
                background: "oklch(.11 .018 255)",
                borderRadius: 8,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {[
                { x: 50, y: 40, l: "SC Ferma Dunărea", s: 18, c: "var(--ok)" },
                { x: 35, y: 55, l: "OUAI Nord", s: 14, c: "var(--in)" },
                { x: 65, y: 30, l: "Coop. Agriland", s: 15, c: "var(--ok)" },
                { x: 45, y: 65, l: "KNN-1", s: 9, c: "var(--t4)" },
                { x: 55, y: 70, l: "KNN-2", s: 9, c: "var(--t4)" },
                { x: 70, y: 55, l: "KNN-3", s: 9, c: "var(--t4)" },
              ].map((p, i) => (
                <div
                  key={i}
                  title={p.l}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.s * 2,
                    height: p.s * 2,
                    borderRadius: "50%",
                    background: `${p.c}33`,
                    border: `2px ${p.s > 10 ? "solid" : "dashed"} ${p.c}`,
                    transform: "translate(-50%,-50%)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => toast.add({ type: "info", title: p.l })}
                >
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: p.c,
                      textAlign: "center",
                    }}
                  >
                    {p.s > 10 ? p.l.split(" ")[0] : ""}
                  </span>
                </div>
              ))}
              <div
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: 8,
                  fontSize: 9.5,
                  color: "var(--t4)",
                }}
              >
                ● Clienți activi ○ Candidați KNN
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Churn({ toast }) {
  const risks = [
    {
      nm: "OUAI Ialomița Nord",
      risk: 67,
      sig: ["Inactiv 32 zile", "NPS 6/10", "1 comandă"],
      act: "Win-back WA urgent",
      st: "AT_RISK",
    },
    {
      nm: "SC AgroSud SRL",
      risk: 45,
      sig: ["Plată restantă €5,208", "Sentiment negativ"],
      act: "Contact manager cont",
      st: "AT_RISK",
    },
    {
      nm: "Ion Popescu PFA",
      risk: 28,
      sig: ["NPS 6/10", "Comandă mică Q4"],
      act: "Ofertă reactivare",
      st: "AT_RISK",
    },
  ];
  return (
    <>
      <PH
        title="Churn Risk Detection"
        sub="AI sentiment + behavior decay · Prevenire automată"
        actions={
          <button
            className="btn btp bsm"
            onClick={() =>
              toast.add({
                type: "success",
                title: "Win-back lansate",
                desc: "3 clienți înrolați",
              })
            }
          >
            Lansează Win-Back
          </button>
        }
      />
      <div className="kg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi
          label="La Risc"
          value="11"
          icon="activity"
          color="var(--wa)"
          bg="oklch(.72 .19 70/12%)"
          change="3 critici"
          ctype="warn"
        />
        <Kpi
          label="Pierdut Luna"
          value="2"
          icon="xmark"
          color="var(--er)"
          bg="oklch(.58 .24 27/12%)"
          change="-€9,400 ARR"
        />
        <Kpi
          label="Win-Back Activ"
          value="4"
          icon="refresh"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
          change="2 reactivați"
          ctype="up"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {risks.map((r, i) => (
          <div
            key={i}
            className="card"
            style={{
              borderColor:
                r.risk > 60
                  ? "oklch(.58 .24 27/40%)"
                  : r.risk > 30
                    ? "oklch(.72 .19 70/30%)"
                    : "oklch(.22 .018 255/60%)",
            }}
          >
            <div className="cb" style={{ padding: "16px 20px" }}>
              <div className="flex as jb g4">
                <div className="f1">
                  <div className="flex ac g3" style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        fontFamily: "var(--fD)",
                        color: "var(--t1)",
                      }}
                    >
                      {r.nm}
                    </span>
                    <SBadge status={r.st} />
                  </div>
                  <div className="flex ac g3" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--t3)" }}>
                      Risc Churn:
                    </span>
                    <div className="pt" style={{ width: 100 }}>
                      <div
                        className="pf"
                        style={{
                          width: `${r.risk}%`,
                          background:
                            r.risk > 60
                              ? "var(--er)"
                              : r.risk > 30
                                ? "var(--wa)"
                                : "var(--ok)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        fontFamily: "var(--fD)",
                        color:
                          r.risk > 60
                            ? "var(--er)"
                            : r.risk > 30
                              ? "var(--wa)"
                              : "var(--ok)",
                      }}
                    >
                      {r.risk}%
                    </span>
                  </div>
                  <div
                    className="flex g2"
                    style={{ marginBottom: 8, flexWrap: "wrap" }}
                  >
                    {r.sig.map((s) => (
                      <span
                        key={s}
                        className="badge ber"
                        style={{ fontSize: 10 }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--t3)" }}>
                    <strong style={{ color: "var(--t2)" }}>Acțiune:</strong>{" "}
                    {r.act}
                  </p>
                </div>
                <div className="flex g2">
                  <button
                    className="btn btb bsm"
                    onClick={() =>
                      toast.add({ type: "success", title: `Win-back: ${r.nm}` })
                    }
                  >
                    <Ic p={I.send} size={13} />
                    Win-Back
                  </button>
                  <button className="btn bto bsm">Profil</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function GeoMap({ toast }) {
  const counties = [
    { nm: "Ialomița", cl: 34, rev: "€67K", d: 85, x: 65, y: 42 },
    { nm: "Dolj", cl: 28, rev: "€52K", d: 72, x: 28, y: 65 },
    { nm: "Călărași", cl: 22, rev: "€41K", d: 61, x: 60, y: 60 },
    { nm: "Brăila", cl: 19, rev: "€38K", d: 55, x: 80, y: 32 },
    { nm: "Teleorman", cl: 12, rev: "€24K", d: 38, x: 38, y: 62 },
  ];
  return (
    <>
      <PH
        title="Hartă Geografică"
        sub="PostGIS · Concentrare județe agricole"
      />
      <EB
        num="5"
        name="Geospatial Expansion"
        msg="PostGIS 3.5 analizează concentrarea clienților. Județe priority: sudul României — Câmpia Dunării."
        type="ok"
      />
      <div className="g2c">
        <div className="card">
          <div className="ch">
            <span className="ct">Harta România Sud</span>
          </div>
          <div className="cb">
            <div
              style={{
                height: 280,
                background: "oklch(.11 .020 200)",
                borderRadius: 8,
                position: "relative",
              }}
            >
              {counties.map((c, i) => {
                const r = 12 + (c.d / 100) * 20;
                return (
                  <div
                    key={i}
                    title={`${c.nm}: ${c.cl} clienți`}
                    style={{
                      position: "absolute",
                      left: `${c.x}%`,
                      top: `${c.y}%`,
                      width: r * 2,
                      height: r * 2,
                      borderRadius: "50%",
                      background: `oklch(.70 .18 72/${0.12 + (c.d / 100) * 0.55})`,
                      border: "2px solid var(--b5)",
                      transform: "translate(-50%,-50%)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 0 ${r}px oklch(.70 .18 72/30%)`,
                    }}
                    onClick={() =>
                      toast.add({
                        type: "info",
                        title: c.nm,
                        desc: `${c.cl} clienți · ${c.rev}`,
                      })
                    }
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "var(--b3)",
                        textAlign: "center",
                        lineHeight: 1.1,
                      }}
                    >
                      {c.nm}
                      <br />
                      {c.cl}
                    </span>
                  </div>
                );
              })}
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  fontSize: 10,
                  color: "var(--t4)",
                }}
              >
                Mărimea = densitate · Click pentru detalii
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <span className="ct">Top Județe</span>
          </div>
          <div className="cb">
            {counties.map((c, i) => (
              <div
                key={i}
                className="sbr"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  toast.add({
                    type: "info",
                    title: c.nm,
                    desc: `${c.cl} clienți · ${c.rev}`,
                  })
                }
              >
                <span
                  className="sbl2"
                  style={{
                    width: 90,
                    fontSize: 12,
                    color: "var(--t1)",
                    fontWeight: 600,
                  }}
                >
                  {c.nm}
                </span>
                <div className="sbt">
                  <div
                    className="sbf"
                    style={{
                      width: `${c.d}%`,
                      background: `oklch(.70 .18 72/${0.4 + (c.d / 100) * 0.6})`,
                    }}
                  />
                </div>
                <span className="sbc" style={{ color: "oklch(.82 .18 82)" }}>
                  {c.rev}
                </span>
              </div>
            ))}
            <div
              style={{
                marginTop: 14,
                padding: 10,
                background: "oklch(.70 .18 72/6%)",
                borderRadius: 8,
                border: "1px dashed oklch(.70 .18 72/25%)",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "var(--b4)",
                  textAlign: "center",
                }}
              >
                🌍 Potențial neexplorat:{" "}
                <strong>Giurgiu, Buzău, Prahova</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Workers({ toast }) {
  const ws = [
    ["PostgreSQL 18.1", "localhost:5432", "1.2ms", "ok", "—"],
    ["Redis 7.4.7", "localhost:6379", "0.3ms", "ok", "—"],
    ["BullMQ — Etapa 1 Enrichment", "12 workers", "—", "ok", "4,892 jobs"],
    ["BullMQ — Etapa 2 Outreach", "8 workers", "—", "ok", "847 jobs"],
    ["BullMQ — Etapa 3 AI Sales", "6 workers", "—", "ok", "47 jobs"],
    ["BullMQ — Etapa 4 Post-Sale", "5 workers", "—", "ok", "12 jobs"],
    ["BullMQ — Etapa 5 Nurturing", "4 workers", "—", "ok", "8 jobs"],
    ["Traefik v3.6.6", ":443/:80", "8ms", "ok", "—"],
    ["SigNoz OTEL", ":4317", "—", "ok", "—"],
    ["API Fastify", "localhost:4000", "12ms", "ok", "—"],
    ["WhatsApp TimelinesAI", "20 numere", "—", "wa", "2 offline"],
    ["Instantly.ai Email", "Hypergrowth plan", "—", "ok", "Warmup 94%"],
  ];
  return (
    <>
      <PH
        title="Workers & Infrastructure"
        sub="BullMQ · Redis · PostgreSQL · Docker · Traefik"
        actions={
          <button
            className="btn bto bsm"
            onClick={() =>
              toast.add({ type: "success", title: "Status actualizat" })
            }
          >
            <Ic p={I.refresh} size={12} />
            Refresh
          </button>
        }
      />
      <div className="kg">
        <Kpi
          label="Servicii Online"
          value="11/12"
          icon="activity"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
        />
        <Kpi
          label="Jobs Active"
          value="5,806"
          icon="zap"
          color="var(--in)"
          bg="oklch(.57 .20 245/12%)"
        />
        <Kpi
          label="Redis Queues"
          value="5"
          icon="db"
          color="var(--b3)"
          bg="oklch(.70 .18 72/12%)"
        />
        <Kpi
          label="CPU / RAM"
          value="34% / 48%"
          icon="chart"
          color="var(--ok)"
          bg="oklch(.60 .22 148/12%)"
        />
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Servicii Infrastructure</span>
        </div>
        <div className="cb" style={{ padding: "8px 0" }}>
          {ws.map(([nm, d, lat, s, j], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 18px",
                borderBottom:
                  i < ws.length - 1
                    ? "1px solid oklch(.18 .018 255/40%)"
                    : "none",
                background:
                  i % 2 === 0 ? "oklch(.13 .018 255/30%)" : "transparent",
              }}
            >
              <span className={`dot d${s}`} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--t1)",
                  flex: 1,
                }}
              >
                {nm}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--t4)",
                  fontFamily: "var(--fM)",
                  width: 160,
                }}
              >
                {d}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "var(--fM)",
                  color: "var(--t3)",
                  width: 60,
                  textAlign: "right",
                }}
              >
                {lat}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: s === "ok" ? "var(--ok)" : "var(--wa)",
                  width: 110,
                  textAlign: "right",
                }}
              >
                {j}
              </span>
              <span className={`badge ${s === "ok" ? "bok" : "bwa"}`}>
                {s === "ok" ? "Online" : "Warning"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Settings({ toast }) {
  const [tab, setTab] = useState("general");
  return (
    <>
      <PH title="Setări" sub="Configurare platformă Cerniq.app" />
      <div className="tabs">
        {[
          ["general", "General"],
          ["integrations", "Integrări API"],
          ["team", "Echipă"],
          ["billing", "Abonament"],
        ].map(([id, lbl]) => (
          <button
            key={id}
            className={`tab${tab === id ? " act" : ""}`}
            onClick={() => setTab(id)}
          >
            {lbl}
          </button>
        ))}
      </div>
      {tab === "general" && (
        <div className="g2c">
          <div className="card">
            <div className="ch">
              <span className="ct">Configurare Tenant</span>
            </div>
            <div
              className="cb"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {[
                ["Nume Companie", "Cerniq.app Demo"],
                ["CUI", "RO12345678"],
                ["Email", "alex@cerniq.app"],
                ["Județ Principal", "București"],
              ].map(([l, v]) => (
                <div key={l}>
                  <span className="lbl">{l}</span>
                  <input className="inp" defaultValue={v} />
                </div>
              ))}
              <button
                className="btn btp"
                onClick={() =>
                  toast.add({ type: "success", title: "Setări salvate" })
                }
              >
                Salvează
              </button>
            </div>
          </div>
          <div className="card">
            <div className="ch">
              <span className="ct">Praguri Automate</span>
            </div>
            <div
              className="cb"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {[
                ["Discount maxim auto (%)", "10"],
                ["Score Gold threshold", "90"],
                ["Churn alert (%)", "40"],
                ["Credit limit default (€)", "15000"],
              ].map(([l, v]) => (
                <div key={l}>
                  <span className="lbl">{l}</span>
                  <input className="inp" defaultValue={v} type="number" />
                </div>
              ))}
              <button
                className="btn btp"
                onClick={() =>
                  toast.add({ type: "success", title: "Praguri salvate" })
                }
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "integrations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["ANAF API", "ok", "••••••••A1B2", "Validare CUI"],
            ["Termene.ro", "ok", "••••••••C3D4", "Credit scoring"],
            ["Oblio.eu (e-Factura)", "ok", "••••••••E5F6", "Facturare SPV"],
            [
              "TimelinesAI WhatsApp",
              "wa",
              "••••••••G7H8",
              "20 numere · 2 offline",
            ],
            ["Instantly.ai Email", "ok", "••••••••I9J0", "Cold email, warmup"],
            ["Sameday Courier", "ok", "••••••••K1L2", "AWB, tracking, COD"],
            ["Revolut Business", "ok", "••••••••M3N4", "Webhooks plăți"],
          ].map(([nm, s, k, d], i) => (
            <div key={i} className="card">
              <div className="cb" style={{ padding: "14px 18px" }}>
                <div className="flex ac g4">
                  <span className={`dot d${s}`} />
                  <div className="f1">
                    <p
                      style={{
                        fontWeight: 700,
                        color: "var(--t1)",
                        marginBottom: 2,
                      }}
                    >
                      {nm}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--t3)" }}>{d}</p>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--fM)",
                      fontSize: 12,
                      color: "var(--t4)",
                    }}
                  >
                    {k}
                  </span>
                  <button
                    className="btn bto bsm"
                    onClick={() =>
                      toast.add({ type: "info", title: `${nm} configurat` })
                    }
                  >
                    <Ic p={I.edit} size={12} />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "team" && (
        <div className="card">
          <div className="cb">
            <p style={{ color: "var(--t3)", fontSize: 13 }}>
              Team management — coming soon
            </p>
          </div>
        </div>
      )}
      {tab === "billing" && (
        <div className="card">
          <div className="cb">
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "var(--fD)",
                  color: "var(--b3)",
                }}
              >
                Plan Professional
              </div>
              <div style={{ fontSize: 14, color: "var(--t3)", marginTop: 4 }}>
                €299/lună · Facturare anuală
              </div>
            </div>
            {[
              ["Contacte Bronze", "Nelimitat"],
              ["Secvențe WA", "20 numere active"],
              ["AI Sales Agent", "Inclus"],
              ["e-Factura", "Inclus via Oblio"],
              ["Support", "Prioritate română"],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid oklch(.20 .018 255/30%)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--t2)" }}>{k}</span>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--ok)" }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const toast = useToasts();
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  return (
    <>
      <Toasts toasts={toast.toasts} rm={toast.rm} />
      {user ? (
        <Shell user={user} onLogout={() => setUser(null)} toast={toast} />
      ) : (
        <Login onLogin={setUser} />
      )}
    </>
  );
}
