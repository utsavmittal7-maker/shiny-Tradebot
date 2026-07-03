import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Wallet, Upload, FileText, LayoutDashboard, ListOrdered, AlertTriangle, Plus, Search,
  Download, Trash2, ArrowLeftRight, Coins, Info, X, ChevronDown, Layers,
  Link2 as LinkIcon, RefreshCw, KeyRound, Globe, CheckCircle2, ShieldCheck,
} from "lucide-react";

/* ============================== DESIGN SYSTEM ============================== */
const CSS = `
:root{
  --ink:#0E1420; --panel:#151D2C; --panel-2:#1A2334; --raise:#202B40;
  --line:#273246; --line-soft:#1E2839;
  --text:#E7ECF3; --muted:#8A97AD; --faint:#5C6980;
  --brand:#4DD0C4; --brand-dim:#2E7C77;
  --up:#35C08A; --down:#F0616D; --warn:#E6B24C;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
  --sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
*{box-sizing:border-box}
.ctx-root{background:var(--ink);color:var(--text);font-family:var(--sans);min-height:100vh;font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
.ctx-root button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-0.01em}
.eyebrow{font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--faint);font-weight:600}
.up{color:var(--up)} .down{color:var(--down)} .warn{color:var(--warn)} .brand{color:var(--brand)}
.hairline{height:1px;background:var(--line-soft)}

/* shell */
.shell{display:grid;grid-template-columns:230px 1fr;min-height:100vh}
.rail{background:var(--panel);border-right:1px solid var(--line);padding:20px 14px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh}
.brandmark{display:flex;align-items:center;gap:10px;padding:2px 8px 18px}
.brandmark .dot{width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,var(--brand),var(--brand-dim));display:flex;align-items:center;justify-content:center;color:#06201E}
.brandmark b{font-weight:700;letter-spacing:-0.02em;font-size:15px}
.brandmark span{display:block;font-size:10px;color:var(--faint);letter-spacing:0.14em;text-transform:uppercase}
.navitem{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;color:var(--muted);font-weight:500;font-size:13.5px;transition:.14s}
.navitem:hover{background:var(--panel-2);color:var(--text)}
.navitem.active{background:var(--raise);color:var(--text)}
.navitem.active .ic{color:var(--brand)}
.railfoot{margin-top:auto;font-size:11px;color:var(--faint);padding:10px 8px;border-top:1px solid var(--line-soft)}
.main{min-width:0}

/* reconciliation bar */
.recon{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line);border-bottom:1px solid var(--line)}
.recon .cell{background:var(--panel);padding:16px 22px;min-width:0}
.recon .cell .lbl{display:flex;align-items:center;gap:6px;margin-bottom:7px}
.recon .cell .val{font-size:23px;font-weight:600;white-space:nowrap}
.recon .cell .sub{font-size:11px;color:var(--faint);margin-top:3px}

/* topbar */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 22px;border-bottom:1px solid var(--line);background:var(--panel);gap:12px;flex-wrap:wrap}
.topbar h1{font-size:16px;font-weight:600;letter-spacing:-0.01em;margin:0}
.selects{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.sel{position:relative}
.sel select{appearance:none;background:var(--panel-2);border:1px solid var(--line);color:var(--text);padding:8px 30px 8px 12px;border-radius:9px;font-family:inherit;font-size:13px;font-weight:500}
.sel .chev{position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted)}

/* content */
.wrap{padding:22px}
.grid{display:grid;gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}
.card h3{margin:0 0 2px;font-size:13.5px;font-weight:600}
.card .cardsub{font-size:11.5px;color:var(--faint);margin-bottom:14px}

/* kpi strip */
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px;min-width:0}
.kpi .k{font-size:24px;font-weight:600;margin-top:6px;white-space:nowrap}
.kpi .d{font-size:11px;color:var(--faint);margin-top:4px}

/* responsive multi-column grids (classes so media queries can override — inline styles cannot) */
.cols2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.col-hero{grid-template-columns:1.1fr minmax(0,1fr)}
.col-tax{grid-template-columns:minmax(0,1fr) 1.6fr}

/* table */
.tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.tbl th{text-align:left;font-weight:600;color:var(--faint);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;padding:9px 12px;border-bottom:1px solid var(--line);white-space:nowrap}
.tbl td{padding:10px 12px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
.tbl tr:hover td{background:var(--panel-2)}
.tbl .r{text-align:right}
/* let wide tables scroll instead of overflowing the page on narrow screens */
.card:has(> table.tbl){overflow-x:auto}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:20px;font-size:10.5px;font-weight:600;background:var(--panel-2);border:1px solid var(--line);text-transform:capitalize}
.pill.buy{color:var(--up)} .pill.sell,.pill.spend{color:var(--down)} .pill.swap{color:var(--brand)}
.pill.income,.pill.staking,.pill.airdrop,.pill.mining,.pill.interest{color:var(--warn)}
.pill.transfer{color:var(--muted)}
.tag{display:inline-block;padding:2px 7px;border-radius:6px;background:var(--panel-2);border:1px solid var(--line);font-size:10.5px;color:var(--muted)}
.miss{color:var(--warn);display:inline-flex;align-items:center;gap:4px;font-size:11px}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:10px;font-weight:600;font-size:13px;background:var(--panel-2);border:1px solid var(--line);color:var(--text);transition:.14s}
.btn:hover{background:var(--raise)}
.btn.primary{background:var(--brand);color:#06201E;border-color:transparent}
.btn.primary:hover{filter:brightness(1.06)}
.btn.ghost{background:transparent}
.btn.sm{padding:6px 11px;font-size:12px}

/* inputs */
.inp{background:var(--panel-2);border:1px solid var(--line);color:var(--text);border-radius:9px;padding:8px 11px;font-family:inherit;font-size:13px;width:100%}
.inp:focus{outline:none;border-color:var(--brand-dim)}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:11px;color:var(--muted);font-weight:500}

/* dropzone */
.drop{border:1.5px dashed var(--line);border-radius:16px;padding:40px;text-align:center;background:var(--panel);transition:.15s}
.drop.hot{border-color:var(--brand);background:var(--panel-2)}
.drop .ic{width:44px;height:44px;color:var(--brand);margin:0 auto 12px}

/* filter chips */
.chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.searchbox{display:flex;align-items:center;gap:8px;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:0 11px;flex:1;min-width:180px}
.searchbox input{background:none;border:none;color:var(--text);padding:9px 0;flex:1;font-family:inherit;font-size:13px}
.searchbox input:focus{outline:none}

/* warnings */
.banner{display:flex;gap:11px;padding:13px 16px;border-radius:12px;border:1px solid;font-size:12.5px;align-items:flex-start}
.banner.warn{background:rgba(230,178,76,0.08);border-color:rgba(230,178,76,0.3);color:#F0D9A6}
.banner.info{background:rgba(77,208,196,0.07);border-color:rgba(77,208,196,0.25);color:#BEE9E4}

/* legend */
.legend{display:flex;flex-direction:column;gap:9px}
.legrow{display:flex;align-items:center;justify-content:space-between;font-size:12.5px}
.legrow .lft{display:flex;align-items:center;gap:9px}
.swatch{width:10px;height:10px;border-radius:3px}

.modal-bg{position:fixed;inset:0;background:rgba(6,10,18,0.72);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px}
.modal{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px;width:100%;max-width:520px;max-height:88vh;overflow:auto}
.modal h3{margin:0 0 16px;font-size:16px}
.rategrid{display:grid;grid-template-columns:1fr 110px;gap:10px 14px;align-items:center}
.rategrid .rl{font-size:12.5px;color:var(--muted)}
.disc{font-size:11px;color:var(--faint);line-height:1.5;margin-top:14px;padding-top:12px;border-top:1px solid var(--line-soft)}
/* laptops / small windows: drop dense 4- and 3-col rows to 2 cols and stack the split layouts */
@media(max-width:1150px){
  .recon,.kpis,.cols3{grid-template-columns:repeat(2,minmax(0,1fr))}
  .col-hero,.col-tax{grid-template-columns:minmax(0,1fr)}
}
/* tablet: sidebar moves to a horizontal top rail */
@media(max-width:820px){
  .shell{grid-template-columns:1fr}
  .rail{position:static;height:auto;flex-direction:row;overflow-x:auto}
  .railfoot{display:none}
}
/* phones: everything single column */
@media(max-width:680px){
  .recon,.kpis,.cols2,.cols3{grid-template-columns:minmax(0,1fr)}
}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:var(--line);border-radius:6px}
::-webkit-scrollbar-track{background:transparent}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
`;

/* ============================== COUNTRY CONFIG ============================== */
// Simplified, transparent rule sets. Estimates only — not filing advice.
const COUNTRIES = {
  US: {
    name: "United States", cur: "$", method: "fifo", ccy: "USD",
    yearStart: { m: 1, d: 1 }, longTermDays: 365,
    rates: { shortRate: 0.24, longRate: 0.15, incomeRate: 0.24 },
    rateLabels: { shortRate: "Short-term rate (<1yr)", longRate: "Long-term rate (≥1yr)", incomeRate: "Income rate (staking/airdrops)" },
    note: "FIFO cost basis. Short-term gains taxed as ordinary income; long-term (held ≥1yr) at preferential rate. Crypto-to-crypto is a disposal. Net capital losses offset gains, then up to $3,000 of ordinary income.",
  },
  UK: {
    name: "United Kingdom", cur: "£", method: "pool", ccy: "GBP",
    yearStart: { m: 4, d: 6 }, longTermDays: null,
    rates: { cgtRate: 0.24, incomeRate: 0.20, allowance: 3000 },
    rateLabels: { cgtRate: "CGT rate", incomeRate: "Income tax rate", allowance: "Annual CGT exemption (£)" },
    note: "Section 104 pooling (average cost). No short/long distinction. Annual CGT exemption applied. Same-day & 30-day 'bed & breakfast' matching is not modelled here — a known simplification.",
  },
  AU: {
    name: "Australia", cur: "A$", method: "fifo", ccy: "AUD",
    yearStart: { m: 7, d: 1 }, longTermDays: 366,
    rates: { marginalRate: 0.325, incomeRate: 0.325, discount: 0.5 },
    rateLabels: { marginalRate: "Marginal CGT rate", incomeRate: "Income rate", discount: "CGT discount (held >12mo)" },
    note: "FIFO. 50% CGT discount on gains held over 12 months (individuals). Capital losses applied before the discount. CGT is added to income at your marginal rate. Tax year 1 Jul – 30 Jun.",
  },
  IN: {
    name: "India", cur: "₹", method: "fifo", ccy: "INR",
    yearStart: { m: 4, d: 1 }, longTermDays: null,
    rates: { vdaRate: 0.30, cess: 0.04, incomeRate: 0.30 },
    rateLabels: { vdaRate: "VDA flat rate", cess: "Health & education cess", incomeRate: "Income (slab) rate" },
    note: "Flat 30% on each gain from Virtual Digital Assets + 4% cess. No deduction except cost of acquisition; losses cannot be set off against gains or other income. 1% TDS on transfers (shown for reference). Tax year 1 Apr – 31 Mar.",
  },
  IE: {
    name: "Ireland", cur: "€", method: "fifo", ccy: "EUR",
    yearStart: { m: 1, d: 1 }, longTermDays: null, filingGrade: true,
    rates: { cgtRate: 0.33, cgtExemption: 1270, srcop: 44000, credits: 4000, prsiRate: 0.041 },
    rateLabels: {
      cgtRate: "CGT rate", cgtExemption: "Annual CGT exemption (€)",
      srcop: "Std-rate cut-off — 20% band (€)", credits: "Annual tax credits (€)", prsiRate: "PRSI rate",
    },
    note: "FIFO with the 4-week (bed & breakfast) rule flagged. CGT at 33% after the €1,270 annual exemption. Staking/airdrops are income at receipt, taxed at your marginal rate — so they stack on your salary through the 20%/40% income-tax bands, the 2025 USC bands (0.5/2/3/8%) and PRSI. Enter your other income below for an accurate marginal figure.",
  },
};

/* ============================== HELPERS ============================== */
const DISPOSAL = new Set(["sell", "spend", "gift_sent"]);
const ACQUIRE = new Set(["buy", "gift_received"]);
const INCOME = new Set(["staking", "airdrop", "mining", "income", "interest", "reward"]);
const TRANSFER = new Set(["transfer", "transfer_in", "transfer_out"]);

const uid = () => Math.random().toString(36).slice(2, 9);
const asNum = (v) => { const n = parseFloat(String(v).replace(/[, ]/g, "")); return isNaN(n) ? 0 : n; };
const fmt = (v, cur = "$", dp = 2) => {
  if (v == null || isNaN(v)) return "—";
  const s = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return (v < 0 ? "-" : "") + cur + s;
};
const fmtQty = (v) => v == null ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: 6 });
const dstr = (d) => new Date(d).toISOString().slice(0, 10);

// distinct color per asset for charts
const PALETTE = ["#4DD0C4", "#7C9CF6", "#E6B24C", "#F0616D", "#9B7CF0", "#35C08A", "#F09A5B", "#59C2E6", "#D067B0", "#8AA0B8"];
const colorFor = (() => { const m = {}; let i = 0; return (k) => (m[k] = m[k] || PALETTE[i++ % PALETTE.length]); })();

/* ============================== TAX ENGINE ============================== */
// Expand transactions -> ordered lot events; match disposals to acquisitions.
function runEngine(txs, method) {
  const rows = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const isPool = method === "pool";
  const lots = {};   // asset -> [{date, qty, cpu}]
  const pool = {};   // asset -> {qty, cost}
  const disposals = [];
  const incomeEvents = [];
  const warnings = [];

  const acquire = (asset, qty, cost, date) => {
    if (qty <= 0) return;
    if (isPool) { pool[asset] = pool[asset] || { qty: 0, cost: 0 }; pool[asset].qty += qty; pool[asset].cost += cost; }
    else { lots[asset] = lots[asset] || []; lots[asset].push({ date, qty, cpu: cost / qty }); }
  };

  const dispose = (tx, asset, qty, proceeds) => {
    const fractions = [];
    let miss = false;
    if (isPool) {
      const p = pool[asset] || { qty: 0, cost: 0 };
      const avail = Math.min(qty, p.qty);
      const avg = p.qty > 0 ? p.cost / p.qty : 0;
      const cost = avg * avail;
      if (p.qty > 0) { p.cost -= cost; p.qty -= avail; }
      const pp = qty > 0 ? proceeds * (avail / qty) : 0;
      if (avail > 0) fractions.push({ qty: avail, cost, acq: null, days: null, gain: pp - cost, miss: false });
      if (avail < qty - 1e-9) { const mq = qty - avail; fractions.push({ qty: mq, cost: 0, acq: null, days: null, gain: proceeds * (mq / qty), miss: true }); miss = true; }
    } else {
      const q = lots[asset] || [];
      if (method === "hifo") q.sort((a, b) => b.cpu - a.cpu);
      let rem = qty;
      while (rem > 1e-9 && q.length) {
        const lot = q[0];
        const take = Math.min(rem, lot.qty);
        const cost = take * lot.cpu;
        const pp = qty > 0 ? proceeds * (take / qty) : 0;
        const days = Math.floor((new Date(tx.date) - new Date(lot.date)) / 864e5);
        fractions.push({ qty: take, cost, acq: lot.date, days, gain: pp - cost, miss: false });
        lot.qty -= take; rem -= take;
        if (lot.qty <= 1e-9) q.shift();
      }
      if (rem > 1e-9) { fractions.push({ qty: rem, cost: 0, acq: null, days: null, gain: proceeds * (rem / qty), miss: true }); miss = true; }
    }
    const gain = fractions.reduce((s, f) => s + f.gain, 0);
    disposals.push({ id: tx.id, date: tx.date, asset, qty, proceeds, gain, fractions, miss, wallet: tx.wallet, platform: tx.platform, kind: tx.type });
    if (miss) warnings.push({ type: "missing_basis", asset, date: tx.date, id: tx.id });
  };

  for (const tx of rows) {
    const t = tx.type;
    const price = asNum(tx.price);
    const amt = asNum(tx.amount);
    const fee = asNum(tx.fee);
    if (ACQUIRE.has(t)) {
      acquire(tx.asset, amt, amt * price + fee, tx.date);
    } else if (INCOME.has(t)) {
      const fiat = amt * price;
      incomeEvents.push({ id: tx.id, date: tx.date, asset: tx.asset, qty: amt, fiat, kind: t });
      acquire(tx.asset, amt, fiat, tx.date); // income sets future cost basis
    } else if (DISPOSAL.has(t)) {
      dispose(tx, tx.asset, amt, amt * price - fee);
    } else if (t === "swap") {
      const fiatVal = asNum(tx.fiatValue) || amt * price;
      dispose(tx, tx.asset, amt, fiatVal);                 // dispose of "from" asset
      const toAmt = asNum(tx.toAmount);
      if (tx.toAsset && toAmt > 0) acquire(tx.toAsset, toAmt, fiatVal, tx.date); // acquire "to" asset
    }
    // transfers: non-taxable, ignored by the lot ledger (same owner, basis carries)
  }

  const remaining = {};
  if (isPool) for (const a in pool) remaining[a] = { qty: pool[a].qty, cost: pool[a].cost, avg: pool[a].qty > 0 ? pool[a].cost / pool[a].qty : 0 };
  else for (const a in lots) { const qty = lots[a].reduce((s, l) => s + l.qty, 0); const cost = lots[a].reduce((s, l) => s + l.qty * l.cpu, 0); remaining[a] = { qty, cost, avg: qty > 0 ? cost / qty : 0 }; }

  return { disposals, incomeEvents, remaining, warnings, fourWeek: fourWeekFlags(rows, disposals) };
}

/* ---- Ireland: filing-grade income levies (2025 bands) ---- */
// Income tax: 20% to the standard-rate cut-off, 40% above, less annual credits.
function ieIncomeTax(income, R) {
  const std = Math.min(income, R.srcop) * 0.20;
  const high = Math.max(0, income - R.srcop) * 0.40;
  return Math.max(0, std + high - R.credits);
}
// USC 2025 single: exempt <= €13,000; then 0.5% / 2% / 3% / 8% across bands.
const USC_BANDS_2025 = [[12012, 0.005], [15370, 0.02], [42662, 0.03], [Infinity, 0.08]];
function ieUSC(income) {
  if (income <= 13000) return 0;
  let rem = income, tax = 0;
  for (const [width, rate] of USC_BANDS_2025) { const t = Math.min(rem, width); tax += t * rate; rem -= t; if (rem <= 0) break; }
  return tax;
}
// Marginal cost of crypto income once salary already fills the lower bands.
function ieMarginalOnIncome(salary, extra, R) {
  const it = ieIncomeTax(salary + extra, R) - ieIncomeTax(salary, R);
  const usc = ieUSC(salary + extra) - ieUSC(salary);
  const prsi = extra > 5000 || salary > 0 ? extra * R.prsiRate : 0; // unearned income PRSI (simplified)
  return { it: Math.max(0, it), usc: Math.max(0, usc), prsi, total: Math.max(0, it) + Math.max(0, usc) + prsi };
}
// 4-week / bed-&-breakfast: a loss may be restricted if the same asset is reacquired within 28 days.
function fourWeekFlags(txs, disposals) {
  const acquires = txs.filter((t) => ACQUIRE.has(t.type) || INCOME.has(t.type) || (t.type === "swap" && t.toAsset));
  const flags = new Set();
  disposals.forEach((d) => {
    if (d.gain >= 0) return;
    const t0 = new Date(d.date).getTime();
    const hit = acquires.some((a) => {
      const asset = a.type === "swap" ? a.toAsset : a.asset;
      if (asset !== d.asset) return false;
      const dt = (new Date(a.date).getTime() - t0) / 864e5;
      return dt >= 0 && dt <= 28;
    });
    if (hit) flags.add(d.id);
  });
  return flags;
}

// Country tax computation over a tax-year window
function computeTax(cc, engine, yearLabel, opts = {}) {
  const C = COUNTRIES[cc];
  const [ys, ye] = yearWindow(cc, yearLabel);
  const inYear = (d) => { const t = new Date(d); return t >= ys && t < ye; };
  const disps = engine.disposals.filter((x) => inYear(x.date));
  const inc = engine.incomeEvents.filter((x) => inYear(x.date));
  const R = C.rates;
  const proceeds = disps.reduce((s, x) => s + x.proceeds, 0);
  const costBasis = disps.reduce((s, x) => s + x.fractions.reduce((a, f) => a + f.cost, 0), 0);
  const incomeTotal = inc.reduce((s, x) => s + x.fiat, 0);
  let capitalTax = 0, incomeTax = 0, taxableGain = 0, netGain = 0, extra = {};

  if (cc === "US") {
    let st = 0, lt = 0;
    disps.forEach((d) => d.fractions.forEach((f) => { (f.days != null && f.days >= C.longTermDays ? (lt += f.gain) : (st += f.gain)); }));
    // net short/long, then offset a loss in one class against a gain in the other
    let nst = st, nlt = lt;
    if (nst < 0 && nlt > 0) { const off = Math.min(-nst, nlt); nlt -= off; nst += off; }
    if (nlt < 0 && nst > 0) { const off = Math.min(-nlt, nst); nst -= off; nlt += off; }
    const capST = Math.max(nst, 0), capLT = Math.max(nlt, 0);
    capitalTax = capST * R.shortRate + capLT * R.longRate;
    netGain = st + lt; taxableGain = capST + capLT;
    const netLoss = Math.min(0, st + lt);
    const ordOffset = Math.min(3000, -netLoss);
    incomeTax = Math.max(0, incomeTotal - ordOffset) * R.incomeRate;
    extra = { shortTerm: st, longTerm: lt, ordOffset };
  } else if (cc === "UK") {
    netGain = disps.reduce((s, x) => s + x.gain, 0);
    taxableGain = Math.max(0, netGain - R.allowance);
    capitalTax = taxableGain * R.cgtRate;
    incomeTax = incomeTotal * R.incomeRate;
    extra = { allowance: R.allowance };
  } else if (cc === "IE") {
    netGain = disps.reduce((s, x) => s + x.gain, 0);
    taxableGain = Math.max(0, netGain - R.cgtExemption);
    capitalTax = taxableGain * R.cgtRate;
    const salary = opts.salary || 0;
    const m = ieMarginalOnIncome(salary, incomeTotal, R);
    incomeTax = m.total;
    const flagged = engine.disposals.filter((d) => (opts.fourWeek || new Set()).has(d.id) && inYear(d.date));
    extra = { allowance: R.cgtExemption, salary, itMarg: m.it, uscMarg: m.usc, prsi: m.prsi, fourWeek: flagged };
  } else if (cc === "AU") {
    let shortG = 0, longG = 0, losses = 0;
    disps.forEach((d) => d.fractions.forEach((f) => {
      if (f.gain < 0) losses += f.gain;
      else if (f.days != null && f.days >= C.longTermDays) longG += f.gain; else shortG += f.gain;
    }));
    let L = -losses;
    const useShort = Math.min(L, shortG); shortG -= useShort; L -= useShort;
    const useLong = Math.min(L, longG); longG -= useLong;
    taxableGain = shortG + longG * (1 - R.discount);
    netGain = shortG + longG - (-losses);
    capitalTax = taxableGain * R.marginalRate;
    incomeTax = incomeTotal * R.incomeRate;
    extra = { discounted: longG, undiscounted: shortG };
  } else if (cc === "IN") {
    const positive = disps.reduce((s, x) => s + Math.max(0, x.gain), 0);
    taxableGain = positive; netGain = disps.reduce((s, x) => s + x.gain, 0);
    capitalTax = positive * R.vdaRate * (1 + R.cess);
    incomeTax = incomeTotal * R.incomeRate * (1 + R.cess);
    extra = { tds: proceeds * 0.01, ignoredLosses: netGain - positive };
  }
  return { window: [ys, ye], disps, inc, proceeds, costBasis, incomeTotal, netGain, taxableGain, capitalTax, incomeTax, totalTax: capitalTax + incomeTax, extra };
}

function yearWindow(cc, label) {
  const C = COUNTRIES[cc];
  const y = parseInt(String(label).slice(0, 4), 10);
  const start = new Date(Date.UTC(y, C.yearStart.m - 1, C.yearStart.d));
  const end = new Date(Date.UTC(y + 1, C.yearStart.m - 1, C.yearStart.d));
  return [start, end];
}
function availableYears(cc, txs) {
  const set = new Set();
  txs.forEach((t) => { const [s] = yearWindow(cc, new Date(t.date).getUTCFullYear()); const y = s.getUTCFullYear(); set.add(y); if (new Date(t.date) < s) set.add(y - 1); });
  const arr = [...set].sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getUTCFullYear()];
}
function yearLabel(cc, y) {
  const C = COUNTRIES[cc];
  return C.yearStart.m === 1 ? `${y}` : `${y}/${String(y + 1).slice(2)}`;
}

/* ============================== SAMPLE DATA ============================== */
const SAMPLE = [
  ["2023-01-15", "Coinbase", "Coinbase", "Bitcoin", "buy", "BTC", 0.5, 21000, 12],
  ["2023-02-10", "Coinbase", "Coinbase", "Ethereum", "buy", "ETH", 5, 1600, 8],
  ["2023-03-05", "Binance", "Binance", "Solana", "buy", "SOL", 100, 22, 3],
  ["2023-04-15", "Binance", "Binance", "Cardano", "buy", "ADA", 300, 0.4, 1],
  ["2023-06-20", "Coinbase", "Coinbase", "Bitcoin", "transfer", "BTC", 0.5, 0, 0, { toWallet: "Ledger" }],
  ["2023-09-01", "Kraken", "Kraken", "Ethereum", "buy", "ETH", 3, 1650, 6],
  ["2023-11-15", "Kraken", "Kraken", "Ethereum", "staking", "ETH", 0.2, 2050, 0],
  ["2024-01-20", "Ledger", "Ledger", "Bitcoin", "sell", "BTC", 0.25, 42000, 20],
  ["2024-02-14", "MetaMask", "MetaMask", "Ethereum", "swap", "ETH", 2, 2800, 0, { toAsset: "SOL", toAmount: 56, fiatValue: 5600 }],
  ["2024-03-10", "MetaMask", "MetaMask", "Arbitrum", "airdrop", "ARB", 200, 1.8, 0],
  ["2024-04-02", "Coinbase", "Coinbase", "Ethereum", "buy", "USDC", 5000, 1, 0],
  ["2024-05-18", "Binance", "Binance", "Solana", "sell", "SOL", 50, 150, 5],
  ["2024-07-01", "MetaMask", "MetaMask", "Polygon", "buy", "MATIC", 2000, 0.72, 4],
  ["2024-08-09", "Ledger", "Ledger", "Bitcoin", "spend", "BTC", 0.05, 60000, 0],
  ["2024-10-22", "Kraken", "Kraken", "Ethereum", "sell", "ETH", 1, 2600, 7],
  ["2024-11-30", "Phantom", "Phantom", "Solana", "staking", "SOL", 3, 230, 0],
  ["2025-01-15", "Phantom", "Phantom", "Solana", "sell", "SOL", 40, 190, 4],
  ["2025-02-20", "Coinbase", "Coinbase", "Ethereum", "buy", "ETH", 2, 2700, 10],
  ["2025-03-11", "MetaMask", "MetaMask", "Polygon", "sell", "MATIC", 1000, 0.55, 2],
  ["2025-04-05", "MetaMask", "MetaMask", "Optimism", "airdrop", "OP", 150, 2.4, 0],
  ["2025-05-01", "Binance", "Binance", "Cardano", "sell", "ADA", 500, 0.7, 3],
].map((r) => ({
  id: uid(), date: r[0], platform: r[1], wallet: r[2], network: r[3], type: r[4],
  asset: r[5], amount: r[6], price: r[7], fee: r[8], source: "Sample data", ...(r[9] || {}),
}));

const CURRENT_PRICES = { BTC: 62000, ETH: 2500, SOL: 175, USDC: 1, MATIC: 0.5, ADA: 0.65, ARB: 1.15, OP: 2.0 };

/* ============================== INGESTION ============================== */
const HEADER_MAP = {
  date: ["date", "time", "timestamp", "datetime"],
  type: ["type", "transaction type", "kind", "operation", "action", "label"],
  asset: ["asset", "coin", "symbol", "currency", "token", "base"],
  amount: ["amount", "quantity", "qty", "size", "units"],
  price: ["price", "spot price", "unit price", "price per unit", "rate"],
  fee: ["fee", "fees", "commission"],
  wallet: ["wallet", "account"],
  platform: ["platform", "exchange", "source"],
  network: ["network", "chain", "blockchain"],
  toAsset: ["to asset", "toasset", "buy asset", "received asset"],
  toAmount: ["to amount", "toamount", "received amount"],
  fiatValue: ["fiat value", "value", "total", "proceeds", "subtotal"],
};
const TYPE_ALIAS = {
  buy: "buy", purchase: "buy", sell: "sell", sold: "sell", sale: "sell",
  swap: "swap", trade: "swap", convert: "swap", exchange: "swap",
  transfer: "transfer", send: "transfer_out", receive: "transfer_in", withdrawal: "transfer_out", deposit: "transfer_in",
  staking: "staking", "staking reward": "staking", reward: "reward", airdrop: "airdrop", mining: "mining",
  interest: "interest", income: "income", spend: "spend", payment: "spend", gift: "gift_received",
};
function normalizeRow(raw) {
  const low = {}; Object.keys(raw).forEach((k) => (low[k.toLowerCase().trim()] = raw[k]));
  const pick = (field) => { for (const cand of HEADER_MAP[field]) if (low[cand] != null && low[cand] !== "") return low[cand]; return undefined; };
  const t0 = String(pick("type") || "").toLowerCase().trim();
  const type = TYPE_ALIAS[t0] || (DISPOSAL.has(t0) || ACQUIRE.has(t0) || INCOME.has(t0) || TRANSFER.has(t0) || t0 === "swap" ? t0 : "buy");
  const dRaw = pick("date");
  const date = dRaw ? new Date(dRaw).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return {
    id: uid(), date, type,
    asset: String(pick("asset") || "?").toUpperCase(),
    amount: asNum(pick("amount")), price: asNum(pick("price")), fee: asNum(pick("fee")),
    wallet: pick("wallet") || pick("platform") || "Imported",
    platform: pick("platform") || pick("wallet") || "Imported",
    network: pick("network") || "—",
    toAsset: pick("toAsset") ? String(pick("toAsset")).toUpperCase() : undefined,
    toAmount: pick("toAmount") ? asNum(pick("toAmount")) : undefined,
    fiatValue: pick("fiatValue") ? asNum(pick("fiatValue")) : undefined,
    source: "File import",
  };
}
/* ---- PDF ingestion (best-effort, browser-side via PDF.js, lazy-loaded) ---- */
const HEADER_WORDS = /^(date|time|timestamp|datetime|type|action|kind|operation|asset|coin|symbol|currency|token|base|amount|quantity|qty|size|units|price|rate|fee|fees|commission|value|total|proceeds|subtotal|wallet|account|platform|exchange|network|chain)$/i;

// Reconstruct text lines from a PDF, grouping items by their y-position and
// keeping each item's x so we can rebuild columns. Returns array of lines,
// each an array of { x, s } text fragments left-to-right.
async function pdfToLines(data) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const pdf = await pdfjs.getDocument({ data }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    const rows = new Map();
    for (const it of content.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      let key = null;
      for (const k of rows.keys()) if (Math.abs(k - y) <= 2) { key = k; break; }
      if (key == null) { key = y; rows.set(key, []); }
      rows.get(key).push({ x: it.transform[4], s: it.str.trim() });
    }
    // PDF y grows upward, so sort descending for top-to-bottom reading order
    for (const [, items] of [...rows.entries()].sort((a, b) => b[0] - a[0])) {
      lines.push(items.sort((a, b) => a.x - b.x));
    }
  }
  return lines;
}

async function parsePdf(data) {
  const lines = await pdfToLines(data);

  // Strategy A: find a header row, then slot each data cell into the nearest
  // header column by x-position and feed the resulting objects to normalizeRow.
  let headerIdx = -1, headerItems = null, bestHits = 2;
  lines.forEach((items, i) => {
    const hits = items.filter((it) => HEADER_WORDS.test(it.s)).length;
    if (hits > bestHits) { bestHits = hits; headerIdx = i; headerItems = items; }
  });
  if (headerIdx >= 0) {
    const cols = headerItems.map((it) => ({ x: it.x, name: it.s }));
    const objs = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const items = lines[i];
      if (items.length < 2) continue;
      const obj = {};
      for (const it of items) {
        let nearest = cols[0], dist = Infinity;
        for (const c of cols) { const d = Math.abs(c.x - it.x); if (d < dist) { dist = d; nearest = c; } }
        obj[nearest.name] = obj[nearest.name] ? `${obj[nearest.name]} ${it.s}` : it.s;
      }
      objs.push(obj);
    }
    const rows = objs.map(normalizeRow).filter((r) => r.amount > 0 || r.type.includes("transfer"));
    if (rows.length) return rows;
  }

  // Strategy B: per-line regex fallback for non-tabular statements.
  const typeWords = Object.keys(TYPE_ALIAS).sort((a, b) => b.length - a.length);
  const rows = [];
  for (const items of lines) {
    const line = items.map((it) => it.s).join(" ").replace(/\s+/g, " ").trim();
    const dateM = line.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
    if (!dateM) continue;
    const type = typeWords.find((w) => line.toLowerCase().includes(w));
    if (!type) continue;
    const rest = line.replace(dateM[0], " ");
    const assetM = rest.match(/\b([A-Z]{2,6})\b/);
    if (!assetM) continue;
    const nums = (rest.match(/-?\d[\d,]*\.?\d+/g) || []).map((n) => Number(n.replace(/,/g, ""))).filter((n) => !isNaN(n));
    rows.push(normalizeRow({ date: dateM[1], type, asset: assetM[1], amount: nums[0], price: nums[1] }));
  }
  const kept = rows.filter((r) => r.amount > 0 || r.type.includes("transfer"));
  if (!kept.length) throw new Error("Couldn't find transaction rows in this PDF. Exchange PDFs vary a lot in layout — if this one didn't parse, export CSV or Excel from your exchange instead.");
  return kept;
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      reader.onload = (e) => {
        const res = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
        resolve(res.data.map(normalizeRow).filter((r) => r.amount > 0 || r.type.includes("transfer")));
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      reader.onload = (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(json.map(normalizeRow).filter((r) => r.amount > 0 || r.type.includes("transfer")));
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "json") {
      reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        const arr = Array.isArray(data) ? data : data.transactions || [];
        resolve(arr.map(normalizeRow).filter((r) => r.amount > 0 || r.type.includes("transfer")));
      };
      reader.readAsText(file);
    } else if (ext === "pdf") {
      reader.onload = (e) => parsePdf(new Uint8Array(e.target.result)).then(resolve).catch(reject);
      reader.readAsArrayBuffer(file);
    } else reject(new Error("Unsupported file type. Use CSV, Excel (.xlsx), JSON, or PDF."));
  });
}

/* ============================== PORTFOLIO ============================== */
function buildPortfolio(txs, engine, prices) {
  // per-wallet / network / platform allocation from signed movements
  const byWallet = {}, byNetwork = {}, byPlatform = {};
  const add = (obj, key, asset, delta) => { obj[key] = obj[key] || {}; obj[key][asset] = (obj[key][asset] || 0) + delta; };
  txs.forEach((t) => {
    const a = asNum(t.amount);
    const plus = () => { add(byWallet, t.wallet, t.asset, a); add(byNetwork, t.network, t.asset, a); add(byPlatform, t.platform, t.asset, a); };
    const minus = () => { add(byWallet, t.wallet, t.asset, -a); add(byNetwork, t.network, t.asset, -a); add(byPlatform, t.platform, t.asset, -a); };
    if (ACQUIRE.has(t.type) || INCOME.has(t.type) || t.type === "transfer_in") plus();
    else if (DISPOSAL.has(t.type) || t.type === "transfer_out") minus();
    else if (t.type === "transfer") { minus(); if (t.toWallet) add(byWallet, t.toWallet, t.asset, a); }
    else if (t.type === "swap") { minus(); const ta = asNum(t.toAmount); if (t.toAsset) { add(byWallet, t.wallet, t.toAsset, ta); add(byNetwork, t.network, t.toAsset, ta); add(byPlatform, t.platform, t.toAsset, ta); } }
  });
  // holdings authoritative from remaining lots
  const holdings = Object.entries(engine.remaining).map(([asset, r]) => {
    const price = prices[asset] ?? 0;
    const value = r.qty * price;
    return { asset, qty: r.qty, avgCost: r.avg, costBasis: r.cost, price, value, unrealized: value - r.cost };
  }).filter((h) => h.qty > 1e-8).sort((a, b) => b.value - a.value);
  const realizedByAsset = {};
  engine.disposals.forEach((d) => (realizedByAsset[d.asset] = (realizedByAsset[d.asset] || 0) + d.gain));
  holdings.forEach((h) => (h.realized = realizedByAsset[h.asset] || 0));
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalUnreal = totalValue - totalCost;
  const totalRealized = engine.disposals.reduce((s, d) => s + d.gain, 0);
  return { holdings, byWallet, byNetwork, byPlatform, totalValue, totalCost, totalUnreal, totalRealized, realizedByAsset };
}

/* ============================== UI PRIMITIVES ============================== */
const Signed = ({ v, cur, big }) => (
  <span className={`num ${v > 0 ? "up" : v < 0 ? "down" : ""}`} style={big ? { fontSize: 23, fontWeight: 600 } : {}}>
    {v > 0 ? "+" : ""}{fmt(v, cur)}
  </span>
);

/* ---------- Empty state (shown before any data is added) ---------- */
function EmptyState({ setView, loadSample }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "52px 24px", maxWidth: 560, margin: "48px auto" }}>
      <div className="dot" style={{ margin: "0 auto 18px", width: 44, height: 44, borderRadius: 12 }}>
        <Wallet size={20} />
      </div>
      <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>No transactions yet</h2>
      <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.65, marginBottom: 26 }}>
        Import your exchange or wallet statements to see your holdings, realized/unrealized
        gains, and estimated tax. Everything stays in your browser — nothing is uploaded.
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn" onClick={() => setView("import")}><Upload size={15} /> Import your data</button>
        <button className="btn ghost" onClick={() => setView("connect")}><LinkIcon size={15} /> Connect an account</button>
        <button className="btn ghost" onClick={loadSample}>Load sample data</button>
      </div>
    </div>
  );
}

/* ============================== PERSISTENCE ============================== */
const LS_KEY = "ledgerline.v1";
function loadSaved() {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ============================== MAIN APP ============================== */
export default function App() {
  const saved = useMemo(loadSaved, []);
  // Start empty by default — your data stays in the browser once you add it.
  const [txs, setTxs] = useState(() => saved?.txs ?? []);
  const [prices, setPrices] = useState(() => saved?.prices ?? CURRENT_PRICES);
  const [country, setCountry] = useState(() => saved?.country ?? "IE");
  const [view, setView] = useState("overview");
  const [ratesOverride, setRatesOverride] = useState(() => saved?.ratesOverride ?? {});
  const [salary, setSalary] = useState(() => saved?.salary ?? 50000); // other annual income, for Ireland marginal rate

  // Persist everything locally so it survives refreshes. Nothing leaves the browser.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ txs, prices, country, salary, ratesOverride }));
    } catch { /* storage full or unavailable — ignore */ }
  }, [txs, prices, country, salary, ratesOverride]);

  // merge editable rates into a working country map
  const C = useMemo(() => {
    const base = COUNTRIES[country];
    return { ...base, rates: { ...base.rates, ...(ratesOverride[country] || {}) } };
  }, [country, ratesOverride]);
  // engine uses the live rates via a patched COUNTRIES clone
  const engine = useMemo(() => runEngine(txs, C.method), [txs, C.method]);
  const years = useMemo(() => availableYears(country, txs), [country, txs]);
  const [taxYear, setTaxYear] = useState(null);
  const activeYear = taxYear ?? years[0];
  const portfolio = useMemo(() => buildPortfolio(txs, engine, prices), [txs, engine, prices]);

  const tax = useMemo(() => {
    // temporarily point COUNTRIES[country].rates at overrides
    const saved = COUNTRIES[country].rates;
    COUNTRIES[country].rates = C.rates;
    const res = computeTax(country, engine, yearLabel(country, activeYear), { salary, fourWeek: engine.fourWeek });
    COUNTRIES[country].rates = saved;
    return res;
  }, [country, engine, activeYear, C.rates, salary]);

  const NAV = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "holdings", label: "Holdings & spread", icon: Coins },
    { id: "transactions", label: "Transactions", icon: ListOrdered },
    { id: "tax", label: "Tax report", icon: FileText },
    { id: "connect", label: "Connect accounts", icon: LinkIcon },
    { id: "import", label: "Import & sources", icon: Upload },
  ];

  // With no data yet, the data-driven views would just show zeros — show a
  // guided empty state instead. Import/Connect still render so data can be added.
  const showEmpty = txs.length === 0 && ["overview", "holdings", "transactions", "tax"].includes(view);

  return (
    <div className="ctx-root">
      <style>{CSS}</style>
      <div className="shell">
        {/* RAIL */}
        <aside className="rail">
          <div className="brandmark">
            <div className="dot"><Layers size={15} /></div>
            <div><b>Ledgerline</b><span>crypto tax</span></div>
          </div>
          {NAV.map((n) => (
            <button key={n.id} className={`navitem ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
              <n.icon size={16} className="ic" /> {n.label}
            </button>
          ))}
          <div className="railfoot">
            Estimates for planning only — not tax filing advice. Verify with a qualified professional in your jurisdiction.
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <h1>{NAV.find((n) => n.id === view).label}</h1>
            <div className="selects">
              <div className="sel">
                <select value={country} onChange={(e) => { setCountry(e.target.value); setTaxYear(null); }}>
                  {Object.entries(COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
                <ChevronDown size={15} className="chev" />
              </div>
              <div className="sel">
                <select value={activeYear} onChange={(e) => setTaxYear(parseInt(e.target.value, 10))}>
                  {years.map((y) => <option key={y} value={y}>Tax year {yearLabel(country, y)}</option>)}
                </select>
                <ChevronDown size={15} className="chev" />
              </div>
            </div>
          </div>

          {showEmpty ? (
            <div className="wrap">
              <EmptyState setView={setView} loadSample={() => setTxs(SAMPLE)} />
            </div>
          ) : (
            <>
              {/* RECONCILIATION BAR — the signature strip */}
              <ReconBar tax={tax} portfolio={portfolio} cur={C.cur} method={C.method} />

              <div className="wrap">
                {view === "overview" && <Overview portfolio={portfolio} engine={engine} cur={C.cur} tax={tax} country={country} setView={setView} />}
                {view === "holdings" && <Holdings portfolio={portfolio} cur={C.cur} prices={prices} setPrices={setPrices} />}
                {view === "transactions" && <Transactions txs={txs} setTxs={setTxs} engine={engine} cur={C.cur} />}
                {view === "tax" && <TaxReport tax={tax} C={C} country={country} activeYear={activeYear}
                  ratesOverride={ratesOverride} setRatesOverride={setRatesOverride} salary={salary} setSalary={setSalary} />}
                {view === "connect" && <Connections setTxs={setTxs} txs={txs} setView={setView} />}
                {view === "import" && <ImportView setTxs={setTxs} txs={txs} country={country} setView={setView} />}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Reconciliation bar ---------- */
function ReconBar({ tax, portfolio, cur, method }) {
  return (
    <div className="recon">
      <div className="cell">
        <div className="lbl"><span className="eyebrow">Realized P/L · year</span></div>
        <div className="val"><Signed v={tax.netGain} cur={cur} /></div>
        <div className="sub">{tax.disps.length} disposals in period</div>
      </div>
      <div className="cell">
        <div className="lbl"><span className="eyebrow">Unrealized P/L</span></div>
        <div className="val"><Signed v={portfolio.totalUnreal} cur={cur} /></div>
        <div className="sub">on {fmt(portfolio.totalValue, cur)} holdings</div>
      </div>
      <div className="cell">
        <div className="lbl"><span className="eyebrow">Taxable income · year</span></div>
        <div className="val num">{fmt(tax.incomeTotal, cur)}</div>
        <div className="sub">{tax.inc.length} income events</div>
      </div>
      <div className="cell">
        <div className="lbl"><span className="eyebrow">Estimated tax · year</span></div>
        <div className="val num warn">{fmt(tax.totalTax, cur)}</div>
        <div className="sub">{method === "pool" ? "S104 pooling" : method.toUpperCase()} basis</div>
      </div>
    </div>
  );
}

/* ---------- Overview ---------- */
function Overview({ portfolio, engine, cur, tax, country, setView }) {
  const alloc = portfolio.holdings.map((h) => ({ name: h.asset, value: h.value, color: colorFor(h.asset) }));
  const realizedBars = Object.entries(portfolio.realizedByAsset)
    .map(([asset, g]) => ({ asset, gain: g })).filter((x) => Math.abs(x.gain) > 0.01)
    .sort((a, b) => b.gain - a.gain);
  const unrealLosses = portfolio.holdings.filter((h) => h.unrealized < 0).sort((a, b) => a.unrealized - b.unrealized);
  const missing = engine.warnings.filter((w) => w.type === "missing_basis");

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
      {(missing.length > 0) && (
        <div className="banner warn">
          <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><b>{missing.length} disposal{missing.length > 1 ? "s" : ""} with missing cost basis.</b> A sell was recorded with no matching acquisition, so its full proceeds are treated as gain — likely overstating tax. Add the original buy in Transactions to fix it. Affected: {[...new Set(missing.map((m) => m.asset))].join(", ")}.</div>
        </div>
      )}

      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Portfolio value</span><div className="k num">{fmt(portfolio.totalValue, cur)}</div><div className="d">{portfolio.holdings.length} assets held</div></div>
        <div className="kpi"><span className="eyebrow">Cost basis</span><div className="k num">{fmt(portfolio.totalCost, cur)}</div><div className="d">remaining lots</div></div>
        <div className="kpi"><span className="eyebrow">Unrealized P/L</span><div className="k"><Signed v={portfolio.totalUnreal} cur={cur} /></div><div className="d">{portfolio.totalCost ? ((portfolio.totalUnreal / portfolio.totalCost) * 100).toFixed(1) : 0}% return</div></div>
        <div className="kpi"><span className="eyebrow">Realized P/L · all time</span><div className="k"><Signed v={portfolio.totalRealized} cur={cur} /></div><div className="d">across all years</div></div>
      </div>

      <div className="grid col-hero" style={{ gap: 16 }}>
        <div className="card">
          <h3>Where your money sits</h3>
          <div className="cardsub">Current value spread across coins</div>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 190, height: 190 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={alloc} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2} stroke="none">
                    {alloc.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} formatter={(v) => fmt(v, cur)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend" style={{ flex: 1, minWidth: 160 }}>
              {alloc.slice(0, 7).map((a) => (
                <div className="legrow" key={a.name}>
                  <div className="lft"><span className="swatch" style={{ background: a.color }} /> {a.name}</div>
                  <span className="num">{fmt(a.value, cur)} · {portfolio.totalValue ? ((a.value / portfolio.totalValue) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Realized gain / loss by coin</h3>
          <div className="cardsub">All-time, using {COUNTRIES[country].method === "pool" ? "pooled" : COUNTRIES[country].method.toUpperCase()} basis</div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer>
              <BarChart data={realizedBars} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <XAxis dataKey="asset" tick={{ fill: "#8A97AD", fontSize: 11 }} axisLine={{ stroke: "#273246" }} tickLine={false} />
                <YAxis tick={{ fill: "#8A97AD", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => fmt(v, cur)} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <ReferenceLine y={0} stroke="#273246" />
                <Bar dataKey="gain" radius={[4, 4, 0, 0]}>
                  {realizedBars.map((b) => <Cell key={b.asset} fill={b.gain >= 0 ? "#35C08A" : "#F0616D"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {unrealLosses.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div><h3 style={{ marginBottom: 2 }}>Tax-loss harvesting opportunities</h3><div className="cardsub" style={{ margin: 0 }}>Unrealized losses you could realize to offset gains{country === "IN" ? " — note: India does not allow loss offset" : ""}</div></div>
            <button className="btn sm" onClick={() => setView("tax")}>Open tax report</button>
          </div>
          <table className="tbl">
            <thead><tr><th>Asset</th><th className="r">Qty</th><th className="r">Avg cost</th><th className="r">Current</th><th className="r">Unrealized loss</th></tr></thead>
            <tbody>
              {unrealLosses.map((h) => (
                <tr key={h.asset}>
                  <td><span className="tag">{h.asset}</span></td>
                  <td className="r num">{fmtQty(h.qty)}</td>
                  <td className="r num">{fmt(h.avgCost, cur)}</td>
                  <td className="r num">{fmt(h.price, cur)}</td>
                  <td className="r"><Signed v={h.unrealized} cur={cur} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Holdings & spread ---------- */
function Holdings({ portfolio, cur, prices, setPrices }) {
  const breakdowns = [
    { title: "By wallet", data: portfolio.byWallet },
    { title: "By network", data: portfolio.byNetwork },
    { title: "By platform", data: portfolio.byPlatform },
  ];
  const valueOf = (assetMap) => Object.entries(assetMap).reduce((s, [a, q]) => s + Math.max(0, q) * (prices[a] ?? 0), 0);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div><h3>Holdings</h3><div className="cardsub">Editable current prices — update to refresh valuations</div></div>
        </div>
        <table className="tbl">
          <thead><tr><th>Asset</th><th className="r">Quantity</th><th className="r">Avg cost</th><th className="r">Current price</th><th className="r">Market value</th><th className="r">Unrealized</th><th className="r">Realized (all-time)</th></tr></thead>
          <tbody>
            {portfolio.holdings.map((h) => (
              <tr key={h.asset}>
                <td><span className="tag">{h.asset}</span></td>
                <td className="r num">{fmtQty(h.qty)}</td>
                <td className="r num">{fmt(h.avgCost, cur)}</td>
                <td className="r">
                  <input className="inp num" style={{ width: 96, textAlign: "right", padding: "5px 8px" }} type="number" value={prices[h.asset] ?? 0}
                    onChange={(e) => setPrices((p) => ({ ...p, [h.asset]: asNum(e.target.value) }))} />
                </td>
                <td className="r num">{fmt(h.value, cur)}</td>
                <td className="r"><Signed v={h.unrealized} cur={cur} /></td>
                <td className="r"><Signed v={h.realized} cur={cur} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid cols3" style={{ gap: 16 }}>
        {breakdowns.map((b) => {
          const rows = Object.entries(b.data).map(([k, m]) => ({ k, v: valueOf(m), assets: Object.keys(m).filter((a) => m[a] > 1e-8).length }))
            .filter((r) => r.v > 0.5).sort((a, z) => z.v - a.v);
          const tot = rows.reduce((s, r) => s + r.v, 0);
          return (
            <div className="card" key={b.title}>
              <h3>{b.title}</h3><div className="cardsub">by current value</div>
              <div className="legend">
                {rows.map((r) => (
                  <div key={r.k}>
                    <div className="legrow"><div className="lft"><Wallet size={13} style={{ color: "var(--muted)" }} /> {r.k}</div><span className="num">{fmt(r.v, cur)}</span></div>
                    <div style={{ height: 5, background: "var(--panel-2)", borderRadius: 4, marginTop: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${tot ? (r.v / tot) * 100 : 0}%`, background: "linear-gradient(90deg,var(--brand-dim),var(--brand))" }} />
                    </div>
                  </div>
                ))}
                {rows.length === 0 && <div className="cardsub" style={{ margin: 0 }}>No balances.</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Transactions ---------- */
const TX_TYPES = ["buy", "sell", "swap", "transfer", "staking", "airdrop", "mining", "income", "interest", "spend", "gift_received", "gift_sent"];
function Transactions({ txs, setTxs, engine, cur }) {
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("all");
  const [fAsset, setFAsset] = useState("all");
  const [fWallet, setFWallet] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const missingIds = new Set(engine.warnings.filter((w) => w.type === "missing_basis").map((w) => w.id));
  const assets = ["all", ...new Set(txs.map((t) => t.asset))];
  const wallets = ["all", ...new Set(txs.map((t) => t.wallet))];
  const filtered = txs.filter((t) => {
    if (fType !== "all" && !(t.type === fType || (fType === "transfer" && t.type.startsWith("transfer")))) return false;
    if (fAsset !== "all" && t.asset !== fAsset) return false;
    if (fWallet !== "all" && t.wallet !== fWallet) return false;
    if (q && !JSON.stringify(t).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const del = (id) => setTxs((p) => p.filter((t) => t.id !== id));

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="chips">
        <div className="searchbox"><Search size={15} style={{ color: "var(--muted)" }} /><input placeholder="Search transactions…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <FSelect v={fType} set={setFType} opts={["all", ...TX_TYPES.filter((t) => t !== "gift_sent")]} label="type" />
        <FSelect v={fAsset} set={setFAsset} opts={assets} label="asset" />
        <FSelect v={fWallet} set={setFWallet} opts={wallets} label="wallet" />
        <button className="btn primary sm" onClick={() => setShowAdd(true)}><Plus size={15} /> Add</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr>
              <th>Date</th><th>Type</th><th>Asset</th><th className="r">Amount</th><th className="r">Price</th>
              <th className="r">Fee</th><th>Platform</th><th>Wallet</th><th>Network</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="num" style={{ color: "var(--muted)" }}>{t.date}</td>
                  <td><span className={`pill ${t.type.split("_")[0]}`}>{t.type === "swap" ? <ArrowLeftRight size={11} /> : null}{t.type.replace("_", " ")}</span></td>
                  <td><span className="tag">{t.asset}</span>{t.toAsset && <span style={{ color: "var(--faint)" }}> → <span className="tag">{t.toAsset}</span></span>}
                    {missingIds.has(t.id) && <div className="miss"><AlertTriangle size={11} /> missing basis</div>}</td>
                  <td className="r num">{fmtQty(t.amount)}{t.toAmount ? ` → ${fmtQty(t.toAmount)}` : ""}</td>
                  <td className="r num">{t.price ? fmt(t.price, cur) : "—"}</td>
                  <td className="r num" style={{ color: "var(--faint)" }}>{t.fee ? fmt(t.fee, cur) : "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{t.platform}</td>
                  <td style={{ color: "var(--muted)" }}>{t.wallet}{t.toWallet ? ` → ${t.toWallet}` : ""}</td>
                  <td><span className="tag">{t.network}</span></td>
                  <td><button className="btn ghost sm" onClick={() => del(t.id)} style={{ padding: 5 }}><Trash2 size={14} style={{ color: "var(--faint)" }} /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: "center", padding: 30, color: "var(--faint)" }}>No transactions match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{filtered.length} of {txs.length} transactions</div>

      {showAdd && <AddTxModal onClose={() => setShowAdd(false)} onAdd={(t) => { setTxs((p) => [...p, t]); setShowAdd(false); }} />}
    </div>
  );
}
function FSelect({ v, set, opts, label }) {
  return (
    <div className="sel">
      <select value={v} onChange={(e) => set(e.target.value)}>
        {opts.map((o) => <option key={o} value={o}>{o === "all" ? `All ${label}s` : String(o).replace("_", " ")}</option>)}
      </select>
      <ChevronDown size={14} className="chev" />
    </div>
  );
}
function AddTxModal({ onClose, onAdd }) {
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), type: "buy", asset: "BTC", amount: "", price: "", fee: "", wallet: "Manual", platform: "Manual", network: "—", toAsset: "", toAmount: "", fiatValue: "" });
  const up = (k, val) => setF((p) => ({ ...p, [k]: val }));
  const submit = () => {
    if (!f.asset || !f.amount) return;
    const t = { id: uid(), ...f, amount: asNum(f.amount), price: asNum(f.price), fee: asNum(f.fee) };
    if (f.type === "swap") { t.toAsset = f.toAsset.toUpperCase(); t.toAmount = asNum(f.toAmount); t.fiatValue = asNum(f.fiatValue); }
    onAdd(t);
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0 }}>Add transaction</h3><button className="btn ghost sm" onClick={onClose}><X size={16} /></button></div>
        <div className="cols2" style={{ gap: 12, marginTop: 16 }}>
          <div className="field"><label>Date</label><input className="inp" type="date" value={f.date} onChange={(e) => up("date", e.target.value)} /></div>
          <div className="field"><label>Type</label>
            <div className="sel"><select className="inp" value={f.type} onChange={(e) => up("type", e.target.value)}>{TX_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></div></div>
          <div className="field"><label>Asset</label><input className="inp" value={f.asset} onChange={(e) => up("asset", e.target.value.toUpperCase())} /></div>
          <div className="field"><label>Amount</label><input className="inp num" type="number" value={f.amount} onChange={(e) => up("amount", e.target.value)} /></div>
          <div className="field"><label>Price (fiat / unit)</label><input className="inp num" type="number" value={f.price} onChange={(e) => up("price", e.target.value)} /></div>
          <div className="field"><label>Fee (fiat)</label><input className="inp num" type="number" value={f.fee} onChange={(e) => up("fee", e.target.value)} /></div>
          {f.type === "swap" && <>
            <div className="field"><label>To asset</label><input className="inp" value={f.toAsset} onChange={(e) => up("toAsset", e.target.value)} /></div>
            <div className="field"><label>To amount</label><input className="inp num" type="number" value={f.toAmount} onChange={(e) => up("toAmount", e.target.value)} /></div>
          </>}
          <div className="field"><label>Wallet</label><input className="inp" value={f.wallet} onChange={(e) => up("wallet", e.target.value)} /></div>
          <div className="field"><label>Platform</label><input className="inp" value={f.platform} onChange={(e) => up("platform", e.target.value)} /></div>
          <div className="field"><label>Network</label><input className="inp" value={f.network} onChange={(e) => up("network", e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Add transaction</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tax report ---------- */
function TaxReport({ tax, C, country, activeYear, ratesOverride, setRatesOverride, salary, setSalary }) {
  const cur = C.cur;
  const setRate = (k, v) => setRatesOverride((p) => ({ ...p, [country]: { ...(p[country] || {}), [k]: asNum(v) } }));
  const exportCSV = () => {
    const rows = [["Asset", "Disposed", "Qty", "Proceeds", "Cost basis", "Gain/Loss", "Acquired", "Holding days", "Missing basis"]];
    tax.disps.forEach((d) => d.fractions.forEach((f) => rows.push([d.asset, d.date, f.qty, (d.proceeds * (f.qty / d.qty)).toFixed(2), f.cost.toFixed(2), f.gain.toFixed(2), f.acq || "—", f.days ?? "—", f.miss ? "YES" : ""])));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `tax-${country}-${activeYear}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="banner info">
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div><b>{C.name} · {C.method === "pool" ? "Section 104 pooling" : C.method.toUpperCase()} basis.</b> {C.note}</div>
      </div>

      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Proceeds</span><div className="k num">{fmt(tax.proceeds, cur)}</div><div className="d">{tax.disps.length} disposals</div></div>
        <div className="kpi"><span className="eyebrow">Cost basis</span><div className="k num">{fmt(tax.costBasis, cur)}</div><div className="d">matched acquisitions</div></div>
        <div className="kpi"><span className="eyebrow">Net capital gain</span><div className="k"><Signed v={tax.netGain} cur={cur} /></div><div className="d">before allowances</div></div>
        <div className="kpi"><span className="eyebrow">Est. total tax</span><div className="k num warn">{fmt(tax.totalTax, cur)}</div><div className="d">cap {fmt(tax.capitalTax, cur)} · inc {fmt(tax.incomeTax, cur)}</div></div>
      </div>

      {country === "IE" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h3>Income from staking & airdrops — marginal rate</h3>
              <div className="cardsub">Crypto income stacks on top of your salary. Enter your other annual income so the 20/40% band, USC and PRSI apply correctly.</div>
              <div className="field" style={{ maxWidth: 240 }}>
                <label>Other annual income (salary etc.)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="num" style={{ color: "var(--muted)" }}>€</span>
                  <input className="inp num" type="number" step="1000" value={salary} onChange={(e) => setSalary(asNum(e.target.value))} style={{ textAlign: "right" }} />
                </div>
              </div>
            </div>
            <div style={{ minWidth: 260, flex: 1 }}>
              <div className="legend">
                <LevyRow label="Crypto income (fair value)" v={tax.incomeTotal} cur={cur} bold />
                <div className="hairline" style={{ margin: "4px 0" }} />
                <LevyRow label={`Income tax (20% → 40% over €${(C.rates.srcop / 1000).toFixed(0)}k)`} v={tax.extra.itMarg} cur={cur} />
                <LevyRow label="USC (2025 bands 0.5/2/3/8%)" v={tax.extra.uscMarg} cur={cur} />
                <LevyRow label={`PRSI (${(C.rates.prsiRate * 100).toFixed(1)}%)`} v={tax.extra.prsi} cur={cur} />
                <div className="hairline" style={{ margin: "4px 0" }} />
                <LevyRow label="Total on income" v={tax.incomeTax} cur={cur} warn bold />
                <LevyRow label="Effective rate on crypto income" text={tax.incomeTotal > 0 ? `${((tax.incomeTax / tax.incomeTotal) * 100).toFixed(1)}%` : "—"} />
              </div>
            </div>
          </div>
        </div>
      )}

      {country === "IE" && tax.extra.fourWeek && tax.extra.fourWeek.length > 0 && (
        <div className="banner warn">
          <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><b>4-week rule may restrict {tax.extra.fourWeek.length} loss{tax.extra.fourWeek.length > 1 ? "es" : ""}.</b> You sold at a loss and reacquired the same asset within 28 days ({[...new Set(tax.extra.fourWeek.map((d) => d.asset))].join(", ")}). Under Ireland's bed-&-breakfast rule that loss can only be set against a gain on the repurchased holding, not against other gains. The estimate above does not yet restrict it — treat it as a ceiling.</div>
        </div>
      )}

      <div className="grid col-tax" style={{ gap: 16 }}>
        {/* rate assumptions */}
        <div className="card">
          <h3>Rate assumptions</h3><div className="cardsub">Edit to match your bracket — tax updates live</div>
          <div className="rategrid">
            {Object.keys(C.rates).map((k) => (
              <React.Fragment key={k}>
                <div className="rl">{C.rateLabels[k]}</div>
                <input className="inp num" type="number" step={k.includes("allowance") ? "50" : "0.01"} value={C.rates[k]}
                  onChange={(e) => setRate(k, e.target.value)} style={{ textAlign: "right", padding: "6px 9px" }} />
              </React.Fragment>
            ))}
          </div>
          <div style={{ marginTop: 8 }} />
          {country === "AU" && <CountryExtra label="Discount-eligible gains" v={tax.extra.discounted} cur={cur} note="50% discount applied" />}
          {country === "US" && <CountryExtra label="Short-term / Long-term" v2={[tax.extra.shortTerm, tax.extra.longTerm]} cur={cur} />}
          {country === "IN" && <>
            <CountryExtra label="1% TDS on transfers (info)" v={tax.extra.tds} cur={cur} />
            <CountryExtra label="Losses ignored (no offset)" v={tax.extra.ignoredLosses} cur={cur} warn />
          </>}
          {country === "UK" && <CountryExtra label="Annual exemption applied" v={C.rates.allowance} cur={cur} />}
          {country === "IE" && <CountryExtra label="CGT exemption applied" v={C.rates.cgtExemption} cur={cur} />}
          <div className="disc">Figures are simplified estimates for planning, not a filed return. Confirm with a qualified advisor before filing.</div>
        </div>

        {/* audit trail */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 18px 12px" }}>
            <div><h3 style={{ margin: 0 }}>Disposal audit trail</h3><div className="cardsub" style={{ margin: "2px 0 0" }}>Every taxable disposal, lot by lot</div></div>
            <button className="btn sm" onClick={exportCSV}><Download size={14} /> Export CSV</button>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Asset</th><th>Disposed</th><th className="r">Qty</th><th className="r">Proceeds</th><th className="r">Cost</th><th className="r">Gain/Loss</th><th>Term</th></tr></thead>
              <tbody>
                {tax.disps.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 26, color: "var(--faint)" }}>No disposals in this tax year.</td></tr>}
                {tax.disps.map((d) => d.fractions.map((f, i) => (
                  <tr key={d.id + i}>
                    <td>{i === 0 ? <span className="tag">{d.asset}</span> : ""}</td>
                    <td className="num" style={{ color: "var(--muted)" }}>{d.date}</td>
                    <td className="r num">{fmtQty(f.qty)}</td>
                    <td className="r num">{fmt(d.proceeds * (f.qty / d.qty), cur)}</td>
                    <td className="r num">{f.miss ? <span className="miss"><AlertTriangle size={11} />missing</span> : fmt(f.cost, cur)}</td>
                    <td className="r"><Signed v={f.gain} cur={cur} /></td>
                    <td>{f.days == null ? <span className="tag">pooled</span> : f.days >= (COUNTRIES[country].longTermDays || 1e9) ? <span className="tag" style={{ color: "var(--up)" }}>long</span> : <span className="tag">short</span>}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {tax.inc.length > 0 && (
        <div className="card">
          <h3>Income events</h3><div className="cardsub">Taxed as income at fair value on receipt — this also becomes the cost basis for future disposals</div>
          <table className="tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Asset</th><th className="r">Qty</th><th className="r">Fair value</th></tr></thead>
            <tbody>
              {tax.inc.map((e) => (
                <tr key={e.id}><td className="num" style={{ color: "var(--muted)" }}>{e.date}</td><td><span className={`pill ${e.kind}`}>{e.kind}</span></td><td><span className="tag">{e.asset}</span></td><td className="r num">{fmtQty(e.qty)}</td><td className="r num">{fmt(e.fiat, cur)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function CountryExtra({ label, v, v2, cur, note, warn }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 12.5 }}>
      <span style={{ color: "var(--muted)" }}>{label}{note ? <span style={{ color: "var(--faint)" }}> · {note}</span> : ""}</span>
      {v2 ? <span className="num"><Signed v={v2[0]} cur={cur} /> / <Signed v={v2[1]} cur={cur} /></span>
        : <span className={`num ${warn ? "warn" : ""}`}>{fmt(v, cur)}</span>}
    </div>
  );
}
function LevyRow({ label, v, text, cur, warn, bold }) {
  return (
    <div className="legrow" style={bold ? { fontWeight: 600 } : {}}>
      <span style={{ color: bold ? "var(--text)" : "var(--muted)" }}>{label}</span>
      <span className={`num ${warn ? "warn" : ""}`}>{text != null ? text : fmt(v, cur)}</span>
    </div>
  );
}

/* ---------- Data sources summary (shared by Import & Connections) ---------- */
function sourceSummary(txs) {
  const g = {};
  txs.forEach((t) => {
    const s = t.source || "Manual entry";
    g[s] = g[s] || { source: s, count: 0, min: t.date, max: t.date, type: t.connType || "file" };
    g[s].count++;
    if (t.date < g[s].min) g[s].min = t.date;
    if (t.date > g[s].max) g[s].max = t.date;
  });
  return Object.values(g).sort((a, b) => b.count - a.count);
}
function DataSources({ txs, setTxs }) {
  const sources = sourceSummary(txs);
  if (!sources.length) return null;
  const remove = (name) => setTxs((p) => p.filter((t) => (t.source || "Manual entry") !== name));
  return (
    <div className="card">
      <h3>Data sources</h3><div className="cardsub">Everything currently loaded, grouped by where it came from — remove a batch to re-import a corrected file</div>
      <table className="tbl">
        <thead><tr><th>Source</th><th>Via</th><th className="r">Transactions</th><th>Period covered</th><th></th></tr></thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.source}>
              <td><b>{s.source}</b></td>
              <td><span className="tag">{s.type}</span></td>
              <td className="r num">{s.count}</td>
              <td className="num" style={{ color: "var(--muted)" }}>{s.min} → {s.max}</td>
              <td className="r"><button className="btn ghost sm" onClick={() => remove(s.source)} style={{ padding: 5 }}><Trash2 size={14} style={{ color: "var(--faint)" }} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Import ---------- */
function ImportView({ setTxs, txs, country, setView }) {
  const [hot, setHot] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [label, setLabel] = useState("");
  const [targetYear, setTargetYear] = useState("auto");
  const inputRef = useRef(null);
  const yearOpts = ["auto", ...availableYears(country, txs)];

  const handle = useCallback(async (files) => {
    setErr(null); setMsg(null);
    let all = [];
    for (const file of files) {
      try {
        const rows = await parseFile(file);
        const src = label.trim() || file.name.replace(/\.[^.]+$/, "");
        rows.forEach((r) => { r.source = src; });
        all = all.concat(rows);
      } catch (e) { setErr(e.message); return; }
    }
    if (!all.length) { setErr("No usable rows found. Check that your file has columns like date, type, asset, amount, price."); return; }
    let kept = all;
    if (targetYear !== "auto") {
      const [ys, ye] = yearWindow(country, targetYear);
      const inY = all.filter((r) => { const d = new Date(r.date); return d >= ys && d < ye; });
      const dropped = all.length - inY.length;
      kept = inY;
      if (!kept.length) { setErr(`None of the ${all.length} rows fall inside tax year ${yearLabel(country, targetYear)}. Switch the year target to "Auto-detect" to import everything.`); return; }
      setMsg(`Imported ${kept.length} transactions into tax year ${yearLabel(country, targetYear)}${dropped ? ` (${dropped} rows outside that year were skipped)` : ""}.`);
    } else {
      const dates = all.map((r) => r.date).sort();
      setMsg(`Imported ${all.length} transactions spanning ${dates[0]} → ${dates[dates.length - 1]}. The tax report scopes to whichever year you select up top.`);
    }
    setTxs((p) => [...p, ...kept]);
  }, [setTxs, label, targetYear, country]);

  const onDrop = (e) => { e.preventDefault(); setHot(false); handle([...e.dataTransfer.files]); };
  const template = () => {
    const csv = "date,type,asset,amount,price,fee,wallet,platform,network\n2024-01-10,buy,BTC,0.1,42000,5,Ledger,Coinbase,Bitcoin\n2024-06-15,sell,BTC,0.05,61000,4,Ledger,Coinbase,Bitcoin\n2024-07-01,staking,ETH,0.3,3200,0,Kraken,Kraken,Ethereum";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "ledgerline-template.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 900 }}>
      <div className="card cols2" style={{ gap: 14 }}>
        <div className="field">
          <label>Label this batch (optional)</label>
          <input className="inp" placeholder="e.g. Kraken 2024 export" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="field">
          <label>Assign to tax year</label>
          <div className="sel">
            <select className="inp" value={targetYear} onChange={(e) => setTargetYear(e.target.value === "auto" ? "auto" : parseInt(e.target.value, 10))}>
              {yearOpts.map((y) => <option key={y} value={y}>{y === "auto" ? "Auto-detect from dates" : `Tax year ${yearLabel(country, y)} only`}</option>)}
            </select>
            <ChevronDown size={14} className="chev" />
          </div>
        </div>
      </div>

      <div className={`drop ${hot ? "hot" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setHot(true); }} onDragLeave={() => setHot(false)} onDrop={onDrop}
        onClick={() => inputRef.current?.click()} style={{ cursor: "pointer" }}>
        <Upload className="ic" />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Drop this year's statements here</div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>CSV, Excel (.xlsx), JSON or PDF from any exchange or wallet. Columns are auto-detected and mapped.</div>
        <input ref={inputRef} type="file" multiple accept=".csv,.tsv,.txt,.xlsx,.xls,.json,.pdf" style={{ display: "none" }}
          onChange={(e) => handle([...e.target.files])} />
      </div>

      {msg && <div className="banner info"><CheckCircle2 size={16} style={{ flexShrink: 0 }} />{msg}</div>}
      {err && <div className="banner warn"><AlertTriangle size={16} style={{ flexShrink: 0 }} />{err}</div>}

      <DataSources txs={txs} setTxs={setTxs} />

      <div className="card">
        <h3>How ingestion works</h3>
        <div className="cardsub">Built to be forgiving about messy real-world exports</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
          <li>Column names are matched flexibly — <span className="brand">quantity/size/units</span> map to amount, <span className="brand">coin/symbol/currency</span> to asset, and so on.</li>
          <li>Types are normalized: <i>deposit/receive</i> → transfer-in, <i>trade/convert</i> → swap, <i>staking reward</i> → income.</li>
          <li>Transfers between your own wallets are treated as non-taxable — cost basis carries across.</li>
          <li>A sell with no matching buy is flagged as <span className="warn">missing cost basis</span> rather than silently assumed.</li>
        </ul>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="btn" onClick={template}><Download size={15} /> Download CSV template</button>
          <button className="btn ghost" onClick={() => setView("connect")}><LinkIcon size={15} /> Connect an exchange instead</button>
          <button className="btn ghost" onClick={() => setTxs(SAMPLE)}>Load sample data</button>
          <button className="btn ghost" onClick={() => setTxs([])}>Clear all ({txs.length})</button>
        </div>
      </div>

      <div className="banner warn" style={{ alignItems: "flex-start" }}>
        <FileText size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div><b>PDF statements:</b> parsed on a best-effort basis right in your browser — it reads the text, finds the transaction table, and maps the columns. Because exchange PDF layouts vary a lot, results can be imperfect; always sanity-check the imported rows. If a PDF doesn't parse cleanly, export CSV or Excel from your exchange (every major one offers this) for the most reliable import.</div>
      </div>
    </div>
  );
}

/* ---------- Connect accounts (connection surface + simulated sync) ---------- */
const PLATFORMS = [
  { id: "coinbase", name: "Coinbase", methods: ["OAuth", "API key"], color: "#2C5FF6", blurb: "Read-only OAuth or API key" },
  { id: "binance", name: "Binance", methods: ["API key"], color: "#E6B24C", blurb: "Read-only API key + secret" },
  { id: "kraken", name: "Kraken", methods: ["API key"], color: "#7C6CF0", blurb: "Read-only API key + secret" },
  { id: "metamask", name: "MetaMask / EVM", methods: ["Public address"], color: "#F09A5B", blurb: "Paste a public 0x… address" },
  { id: "phantom", name: "Phantom / Solana", methods: ["Public address"], color: "#9B7CF0", blurb: "Paste a Solana address" },
  { id: "ledger", name: "Ledger / Hardware", methods: ["Public address", "xPub"], color: "#59C2E6", blurb: "Watch-only via xPub or address" },
];
function genDemo(name) {
  const today = new Date();
  const d = (days) => new Date(today.getTime() - days * 864e5).toISOString().slice(0, 10);
  const base = [
    { type: "buy", asset: "ETH", amount: 1.5, price: 2450, fee: 6, network: "Ethereum" },
    { type: "staking", asset: "ETH", amount: 0.08, price: 2500, fee: 0, network: "Ethereum" },
    { type: "buy", asset: "SOL", amount: 20, price: 168, fee: 2, network: "Solana" },
    { type: "sell", asset: "SOL", amount: 8, price: 182, fee: 1.5, network: "Solana" },
  ];
  return base.map((b, i) => ({
    id: uid(), date: d(120 - i * 25), platform: name, wallet: name, source: `${name} (synced)`,
    connType: "api", ...b,
  }));
}
function Connections({ setTxs, txs, setView }) {
  const [active, setActive] = useState(null); // platform being connected
  const [status, setStatus] = useState({});   // id -> 'syncing' | 'done'
  const connected = new Set(txs.filter((t) => t.connType === "api").map((t) => t.source));

  const doSync = (p) => {
    setActive(null);
    setStatus((s) => ({ ...s, [p.id]: "syncing" }));
    setTimeout(() => {
      const rows = genDemo(p.name);
      setTxs((prev) => [...prev.filter((t) => t.source !== `${p.name} (synced)`), ...rows]);
      setStatus((s) => ({ ...s, [p.id]: "done" }));
    }, 1100);
  };

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 900 }}>
      <div className="banner info" style={{ alignItems: "flex-start" }}>
        <ShieldCheck size={17} style={{ flexShrink: 0, marginTop: 1 }} />
        <div><b>Simulated in this preview.</b> Live exchange sync must run server-side — API secrets can't be safely held in a browser and exchanges block browser-origin calls (CORS). Below is the real connection flow; pressing <b>Connect</b> runs a demo sync that loads sample transactions so you can see how it lands in your ledger. Production wiring is outlined at the bottom.</div>
      </div>

      <div className="grid cols3" style={{ gap: 14 }}>
        {PLATFORMS.map((p) => {
          const st = status[p.id];
          const isConn = connected.has(`${p.name} (synced)`) || st === "done";
          return (
            <div className="card" key={p.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#0E1420" }}>
                  {p.methods[0] === "Public address" ? <Globe size={16} /> : <KeyRound size={16} />}
                </div>
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--faint)" }}>{p.blurb}</div></div>
              </div>
              <div className="chips" style={{ marginBottom: 12 }}>{p.methods.map((m) => <span className="tag" key={m}>{m}</span>)}</div>
              {isConn ? (
                <button className="btn sm" style={{ width: "100%", color: "var(--up)" }} disabled><CheckCircle2 size={14} /> Connected · synced</button>
              ) : st === "syncing" ? (
                <button className="btn sm" style={{ width: "100%" }} disabled><RefreshCw size={14} className="spin" /> Syncing…</button>
              ) : (
                <button className="btn primary sm" style={{ width: "100%" }} onClick={() => setActive(p)}><LinkIcon size={14} /> Connect</button>
              )}
            </div>
          );
        })}
      </div>

      <DataSources txs={txs} setTxs={setTxs} />

      <div className="card">
        <h3>What a production build wires up</h3>
        <div className="cardsub">The parts that must live on a server, not in this page</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
          <li><b>Key vault + OAuth callback</b> — read-only API keys and OAuth tokens stored encrypted server-side; the browser never sees a secret.</li>
          <li><b>Per-exchange connectors</b> — Coinbase, Binance, Kraken etc. each have their own auth signing, pagination, and transaction schema to normalize.</li>
          <li><b>On-chain indexers</b> — public addresses/xPubs resolved through keyed providers (Etherscan, Covalent, an RPC node) to pull swaps, transfers, staking and gas.</li>
          <li><b>Background sync + historical prices</b> — scheduled jobs refresh new activity and stamp each transaction with its fair-market fiat value at the time.</li>
        </ul>
      </div>

      {active && <ConnectModal p={active} onClose={() => setActive(null)} onConnect={() => doSync(active)} />}
    </div>
  );
}
function ConnectModal({ p, onClose, onConnect }) {
  const addressMethod = p.methods[0] === "Public address";
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0 }}>Connect {p.name}</h3><button className="btn ghost sm" onClick={onClose}><X size={16} /></button></div>
        <div className="banner info" style={{ margin: "14px 0" }}><ShieldCheck size={15} style={{ flexShrink: 0 }} /><div>Read-only access only. This preview does not transmit anything — it loads demo transactions.</div></div>
        {addressMethod ? (
          <div className="field"><label>Public wallet address</label><input className="inp num" placeholder="0x… or Solana address" /></div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field"><label>API key (read-only)</label><input className="inp num" placeholder="paste key" /></div>
            <div className="field"><label>API secret</label><input className="inp num" type="password" placeholder="paste secret" /></div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={onConnect}><RefreshCw size={15} /> Connect & sync</button>
        </div>
      </div>
    </div>
  );
}

const tipStyle = { background: "#151D2C", border: "1px solid #273246", borderRadius: 10, color: "#E7ECF3", fontSize: 12 };
