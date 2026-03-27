import { useState } from 'react';

// ============================================================
// 2026 TAX ENGINE
// ============================================================
const FED = {
MFJ: { std: 32200, bk: [[24800,.10],[100800,.12],[201800,.22],[383800,.24],[487450,.32],[768600,.35],[Infinity,.37]], cp: 400000 },
S:   { std: 16100, bk: [[12400,.10],[50400,.12],[100900,.22],[191900,.24],[243700,.32],[609350,.35],[Infinity,.37]], cp: 200000 },
HOH: { std: 24150, bk: [[17650,.10],[67500,.12],[100900,.22],[191900,.24],[243700,.32],[609350,.35],[Infinity,.37]], cp: 200000 },
};
const ME = {
MFJ: { std: 30600, exe: 5300, bk: [[52100,.058],[123250,.0675],[Infinity,.0715]] },
S:   { std: 15300, exe: 5300, bk: [[26050,.058],[61600,.0675],[Infinity,.0715]] },
HOH: { std: 22450, exe: 5300, bk: [[52100,.058],[61600,.0675],[Infinity,.0715]] },
};
const CTC = 2200, ACTC_MX = 1700;
const SAV = { MFJ:[48500,52500,80500], S:[24250,26250,40250], HOH:[36375,39375,60375] };
const HSA_L = { self: 4400, family: 8750 };
const SAWW = 1198.84;

// EITC 2026 -- Rev Proc 2025-32 (verified)
// [phaseInRate, maxCredit, earnedIncForMax, phaseOutStart_S, phaseOutStart_MFJ, phaseOutRate]
const EITC_T = [
[0.0765,   664,  8680, 10860, 18140, 0.0765],  // 0 kids
[0.34,    4427, 13020, 23890, 31160, 0.1598],   // 1 kid
[0.40,    7316, 18290, 23890, 31160, 0.2106],   // 2 kids
[0.45,    8231, 18290, 23890, 31160, 0.2106],   // 3+ kids
];
const EITC_INV_LIMIT = 12200;

// OBBBA Senior Deduction (2025-2028): $6,000/person 65+, phases out at 6% over threshold
const SENIOR_DED = 6000;
const SENIOR_PO = { S: 75000, MFJ: 150000, HOH: 75000 };

function ptax(inc, bk) {
let t = 0, p = 0;
for (const [top, r] of bk) { if (inc <= p) break; t += (Math.min(inc, top) - p) * r; p = top; }
return Math.round(t);
}
function sRate(agi, s) {
const t = SAV[s]; if (agi <= t[0]) return .5; if (agi <= t[1]) return .2; if (agi <= t[2]) return .1; return 0;
}
function pfmlB(wg) {
return Math.min(SAWW, .9 * SAWW * .5 + .66 * Math.max(0, wg - SAWW * .5));
}
function stfcCalc(ln9, kids, fs) {
if (fs === "S") { if (ln9 <= 24750) return 150; const s = Math.floor((ln9-24750)/500); return Math.max(0, 150-(s+1)*10); }
const col = kids >= 2 ? 2 : kids >= 1 ? 1 : 0;
const base = fs === "HOH" ? 37100 : 49500;
const step = fs === "HOH" ? 750 : 1000;
const mx = [210,240,270][col];
const dec = fs === "HOH" ? 15 : 20;
if (ln9 <= base) return mx;
const s = Math.floor((ln9 - base) / step);
return Math.max(0, mx - (s+1) * dec);
}
function calcEitc(earnedInc, agi, kids, fs) {
const row = EITC_T[Math.min(kids, 3)];
const [piRate, maxCr, , poS, poMFJ, poRate] = row;
const poStart = fs === "MFJ" ? poMFJ : poS;
const credit = Math.min(Math.round(earnedInc * piRate), maxCr);
const poIncome = Math.max(earnedInc, agi);
if (poIncome <= poStart) return credit;
return Math.max(0, credit - Math.round((poIncome - poStart) * poRate));
}
// OBBBA Child & Dependent Care Credit (2026+, nonrefundable)
function calcCDCTC(agi, expenses, fs) {
if (expenses <= 0) return 0;
let pct;
if (fs === "MFJ") {
if (agi <= 15000) pct = 50;
else if (agi <= 43000) pct = 50 - Math.ceil((agi - 15000) / 2000);
else if (agi <= 150000) pct = 35;
else if (agi <= 210000) pct = 35 - Math.ceil((agi - 150000) / 2000) * (15/30);
else pct = 20;
} else {
if (agi <= 15000) pct = 50;
else if (agi <= 43000) pct = 50 - Math.ceil((agi - 15000) / 2000);
else if (agi <= 75000) pct = 35;
else if (agi <= 105000) pct = 35 - Math.ceil((agi - 75000) / 2000) * (15/30);
else pct = 20;
}
pct = Math.max(20, Math.min(50, pct));
return Math.round(expenses * pct / 100);
}

const f$ = n => { const a = Math.abs(Math.round(n)); return (n<0?"-":"")+"$"+a.toLocaleString(); };
const fp = n => Math.round(n*100)+"%";

function calc(i) {
const fs = i.filingStatus, fed = FED[fs], me = ME[fs];
const wg = i.payType === "hourly" ? i.hourlyRate * i.hoursPerWeek + (i.otHours||0) * i.hourlyRate * 1.5 : i.salary / 52;
const ww = 52 - (i.pfmlWeeks||0);
const ag = wg * ww, ap = i.pfmlWeeks > 0 ? pfmlB(wg) * i.pfmlWeeks : 0;
const hp = (i.healthPremium||0) * 52;
const t4 = ag * (i.trad401kPct||0)/100, r4 = ag * (i.roth401kPct||0)/100;
const hl = i.hsaEligible ? HSA_L[i.hsaTier||"self"] : 0;
const hc = Math.min(i.hsaContrib||0, hl);
const w2 = ag - hp - t4 - hc;
const si = i.spouseIncome||0, spt = si * (i.spouseTrad401kPct||0)/100;
const ln9 = w2 + ap + (i.otherIncome||0) + (si - spt);
const sli = Math.min(i.slInterest||0, 2500);
const agi = ln9 - sli;

// OBBBA Overtime Deduction (2025-2028): deductible = the 0.5x premium portion
const otPremium = i.payType === "hourly" ? (i.otHours||0) * i.hourlyRate * 0.5 * ww : 0;
const otDedCap = fs === "MFJ" ? 25000 : 12500;
const otMagiTh = fs === "MFJ" ? 300000 : 150000;
const otDed = agi > otMagiTh ? 0 : Math.min(Math.round(otPremium), otDedCap);

// OBBBA Tip Deduction (2025-2028)
const tipDedCap = fs === "MFJ" ? 50000 : 25000;
const tipMagiTh = fs === "MFJ" ? 300000 : 150000;
const tipDed = agi > tipMagiTh ? 0 : Math.min(i.annualTips||0, tipDedCap);

// OBBBA Senior Deduction (2025-2028): $6,000 per person 65+, 6% phase-out
const seniorTh = SENIOR_PO[fs] || 75000;
const seniorCount = i.age65 ? (fs === "MFJ" ? (i.spouseAge65 ? 2 : 1) : 1) : 0;
let seniorDed = seniorCount * SENIOR_DED;
if (agi > seniorTh && seniorDed > 0) {
seniorDed = Math.max(0, seniorDed - Math.round((agi - seniorTh) * 0.06));
}

// Federal taxable income (standard deduction + OT deduction + tip deduction + senior deduction)
const fti = Math.max(0, agi - fed.std - otDed - tipDed - seniorDed);
const fg = ptax(fti, fed.bk);
const nk = i.numKidsUnder17||0;
const ctc = nk * CTC, aCTC = Math.max(0, fg - ctc);
const actc = Math.min(ACTC_MX * nk, Math.max(0, ctc - fg));
const jq = Math.min(t4+r4, 2000), sq = Math.min(i.spouseRetire||0, 2000);
const sr = sRate(agi, fs), sm = Math.round((jq+sq)*sr), su = Math.min(sm, aCTC);
const nf = Math.max(0, aCTC - su);

// EITC -- federal (earned income = gross wages, full OT included)
const eitcEI = ag + (si > 0 ? si : 0); // both spouses' earned income for MFJ
const invInc = i.otherIncome || 0; // simplified: treat other income as investment for EITC limit
const eitc = invInc > EITC_INV_LIMIT ? 0 : calcEitc(eitcEI, agi, nk, fs);
// Maine EITC: 25% of federal EITC (with kids), 50% (without kids), refundable
const meEitc = Math.round(eitc * (nk > 0 ? 0.25 : 0.50));

// OBBBA Child & Dependent Care Credit (nonrefundable)
const ccExpCap = (i.numKidsUnder13||0) >= 2 ? 6000 : (i.numKidsUnder13||0) >= 1 ? 3000 : 0;
const ccExp = Math.min(i.childcareExpenses||0, ccExpCap);
const cdctcGross = calcCDCTC(agi, ccExp, fs);
const cdctc = Math.min(cdctcGross, nf); // nonrefundable: limited to tax liability after other credits

const fb = ag - hp - hc;
const mf = fb * .0765, sf = si * .0765;
const mi = ln9 - ap, ma = mi - sli;
const ne = fs === "MFJ" ? 2 : 1;
const mti = Math.max(0, ma - me.std - me.exe * ne);
const mg = ptax(mti, me.bk);
const rent = i.housingType === "rent" ? (i.monthlyHousing||0)*12 : 0;
const pt = i.housingType === "own" ? (i.annualPropTax||0) : 0;
const ht = i.housingType === "rent" && i.rentIncHeat ? rent*.15 : 0;
const pb = i.housingType === "rent" ? (rent-ht)*.15 : pt;
const pc = Math.min(i.age65?2000:1000, Math.round(Math.max(0, pb - ln9*.04)));
const sc = stfcCalc(ln9, nk, fs);
const sl = Math.min(i.slPayments||0, 2500);
const nDeps = i.numKidsUnder17||0;
const dc = nDeps * 300; // Maine 5219-SS: $300/dependent for 2026

// Maine net: credits minus gross tax (includes Maine EITC)
const mn = sl + dc + pc + sc + meEitc - mg;

// Federal balance: net tax minus all refundable credits, plus nonrefundable CDCTC
const fedAfterCDCTC = Math.max(0, nf - cdctc);
const fedBal = fedAfterCDCTC - actc - eitc;
const tr = Math.max(0, -fedBal) + Math.max(0, mn);
const to = Math.max(0, fedBal) + Math.max(0, -mn);

const wf = nf/52, wmf = mf/ww;
const at = i.weeklyAfterTax||0;
const wth = wg - (i.healthPremium||0) - t4/ww - r4/ww - hc/ww - wmf - wf - at;
const pth = (i.pfmlWeeks > 0 ? pfmlB(wg) : 0) - (i.healthPremium||0) - wf - at;
const ja = wth*ww + pth*(i.pfmlWeeks||0);
const sn = si - sf - spt;
const an = ja + sn, mt = an/12;
const ms = mt + (i.otherIncome||0)/12 - (i.monthlyExpenses||0) - (i.spouseRetire||0)/12;
const tre = t4 + r4 + hc + (i.spouseRetire||0) + spt;
const mr = (fti <= fed.bk[0][0] ? .10 : .12) + .0765 + (mti <= me.bk[0][0] ? .058 : .0675);
const hr = .12 + (mti <= me.bk[0][0] ? .058 : .0675) + .0765;
return {
wg, ww, ag, ap, hp, t4, r4, hc, hl, w2, ln9, agi, fti, fg, ctc, aCTC, actc,
jq, sq, sr, sm, su, nf, mf, sf, mi, ma, mti, mg, pc, sc, sl, dc, mn, tr, to,
wf, wth, pth, ja, sn, an, mt, ms, tre, mr, hr, spt,
otDed, tipDed, seniorDed, eitc, meEitc, otPremium, cdctc,
pfmlBen: i.pfmlWeeks > 0 ? pfmlB(wg) : 0,
};
}

// ============================================================
// McKINSEY DESIGN SYSTEM
// ============================================================
const C = {
bg: "#F7F8FA", card: "#FFFFFF", cardAlt: "#F2F4F8",
border: "#E2E6ED", borderLight: "#EEF0F4",
text: "#1A1F36", textSec: "#525F7F", textMuted: "#8898AA",
navy: "#051C2C", navyLight: "#0B3654",
blue: "#027BBD", bluePale: "#EBF5FB",
green: "#0D7A3E", greenPale: "#E8F5EE",
red: "#C4291C", redPale: "#FDECEB",
amber: "#B45309", amberPale: "#FEF7E6",
white: "#FFFFFF", rule: "#D4D9E2",
};

const font = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const mono = "'SF Mono', 'Fira Code', 'Consolas', monospace";

const printCSS = ` 
/* Mobile & Safari Optimizations */
@supports (-webkit-appearance: none) {
  input[type="number"] { font-size: 16px !important; }
  input:not([type="checkbox"]) { margin: 0; -webkit-appearance: none; appearance: none; border-radius: 4px; }
  input[type="checkbox"] { -webkit-appearance: checkbox; appearance: checkbox; margin-right: 8px; }
  button { -webkit-appearance: none; appearance: none; }
}

/* Range Slider Styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #E2E6ED;
  outline: none;
  border: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #051C2C;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #051C2C;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

input[type="range"]::-moz-range-track {
  background: transparent;
  border: none;
}

/* Desktop: Reduced height number inputs */
@media (min-width: 769px) {
  .num-input { min-height: 40px !important; }
}

/* Mobile Responsive (max-width: 768px) */
@media (max-width: 768px) {
  body { padding: 0; margin: 0; }
  * { box-sizing: border-box; }
  .grid-3 { grid-template-columns: 1fr !important; gap: 8px !important; }
  .grid-2 { grid-template-columns: 1fr !important; gap: 8px !important; }
  .flex-kpi { flex-direction: column !important; gap: 8px !important; }
  .mobile-stack { flex-direction: column !important; }
  .mobile-hide { display: none !important; }
  .mobile-show { display: flex !important; }
  input[type="number"] { font-size: 16px !important; padding: 10px 12px !important; }
  button { padding: 12px 16px !important; font-size: 14px !important; min-height: 44px; min-width: 44px; }
  input[type="text"], input[type="email"], select, textarea { font-size: 16px !important; padding: 12px !important; }
  .num-input { min-height: 44px !important; }
}

/* Tablet (max-width: 1024px) */
@media (max-width: 1024px) {
  .grid-3 { grid-template-columns: 1fr 1fr !important; }
}

/* Small devices (max-width: 480px) */
@media (max-width: 480px) {
  body { font-size: 14px; }
  h1, .text-xl { font-size: 18px !important; }
  h2, .text-lg { font-size: 16px !important; }
  .no-mobile { display: none !important; }
}

/* Print Styles */
@media print {
  body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
}

/* Desktop Enhancements (min-width: 769px) */
@media (min-width: 769px) {
  .tabs-container button { font-size: 12px !important; padding: 12px 16px !important; }
}
`;

const Card = ({ title, sub, children, noPad }) => (

  <div style={{ marginBottom: 16, background: C.white, borderRadius: 4, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
    {title && (
      <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, letterSpacing: "0.06em", textTransform: "uppercase" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
      </div>
    )}
    <div style={noPad ? {} : { padding: "16px 20px" }}>{children}</div>
  </div>
);

const Field = ({ label, tip, children }) => (

  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 6, letterSpacing: "0.02em" }}>{label}</div>
    {tip && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{tip}</div>}
    {children}
  </div>
);

const inp = { padding: "10px 12px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 14, fontFamily: mono, outline: "none", transition: "border-color 0.15s", minHeight: 40 };

const Num = ({ val, set, pre="$", min=0, max, step=1, w=100 }) => (

  <div style={{ display: "flex", alignItems: "center", gap: 4, minHeight: 44 }} className="num-input">
    {pre && <span style={{ color: C.textMuted, fontSize: 12, fontFamily: mono, lineHeight: 1 }}>{pre}</span>}
    <input type="number" value={val || ""} min={min} max={max} step={step}
      placeholder="0"
      onChange={e => set(e.target.value === "" ? 0 : +e.target.value)}
      onFocus={e => { e.target.style.borderColor = C.blue; if (val === 0) e.target.value = ""; }}
      onBlur={e => { e.target.style.borderColor = C.border; if (e.target.value === "") set(0); }}
      style={{ ...inp, width: w, minHeight: 40, fontSize: '16px' }} />
  </div>
);

const Toggle = ({ options, val, set }) => (

  <div style={{ display: "inline-flex", borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}`, backgroundColor: C.white }}>
    {options.map((o, idx) => (
      <button key={o.v} onClick={() => set(o.v)} style={{
        padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44,
        background: val === o.v ? C.navy : C.white, color: val === o.v ? "#fff" : C.textSec,
        border: "none", borderRight: idx < options.length - 1 ? `1px solid ${C.border}` : "none",
        transition: "all 0.15s", fontFamily: font,
      }}>{o.l}</button>
    ))}
  </div>
);

const KPI = ({ label, val, sub, color, accent }) => (

  <div style={{ padding: "16px 20px", background: accent || C.white, borderRadius: 4, border: `1px solid ${C.border}`, flex: 1, minWidth: 140 }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: color || C.navy, fontFamily: mono, letterSpacing: "-0.02em", lineHeight: 1 }}>{val}</div>
    {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
  </div>
);

const Tooltip = ({ text, children }) => {
const [show, setShow] = useState(false);
return (
<div style={{ display: "inline-flex", alignItems: "center", position: "relative" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
{children}
{show && (
<div style={{
position: "absolute", bottom: "100%", left: 0, marginBottom: 8, background: C.navy, color: "#fff", fontSize: 11,
padding: "8px 10px", borderRadius: 4, whiteSpace: "nowrap", zIndex: 1000, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
}}>
{text}
<div style={{ position: "absolute", top: "100%", left: 8, width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `4px solid ${C.navy}` }} />
</div>
)}
</div>
);
};

const HBar = ({ label, val, max, color = C.blue }) => {
const p = max > 0 ? Math.min(100, Math.round(val / max * 100)) : 0;
return (
<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
<div style={{ width: 140, fontSize: 12, color: C.textSec, flexShrink: 0 }}>{label}</div>
<div style={{ flex: 1, height: 8, background: C.cardAlt, borderRadius: 2, overflow: "hidden" }}>
<div style={{ height: 8, background: color, borderRadius: 2, width: p+"%", transition: "width 0.4s ease" }} />
</div>
<div style={{ width: 80, textAlign: "right", fontSize: 13, fontWeight: 600, color: C.text, fontFamily: mono, flexShrink: 0 }}>{f$(val)}</div>
</div>
);
};

// ============================================================
// TOOLTIP EXPLANATIONS
// ============================================================
const tooltips = {
  "W-2 Wages": "Gross wages from employment before any deductions (401k, health insurance, etc)",
  "PFML Benefits": "Paid Family & Medical Leave benefits received from Maine PFML program",
  "Spouse Income": "Spouse's W-2 wages or income subject to tax",
  "Other Income": "1099 income, business income, or other taxable income not from W-2",
  "Total Income (Line 9)": "Sum of all wages, benefits, and other income — your starting point for tax calculation",
  "Student Loan Interest Deduction": "Interest paid on qualified student loans, deductible up to $2,500/year",
  "Adjusted Gross Income": "Income after above-the-line deductions — key threshold for many credits and phase-outs",
  "Standard Deduction": `IRS standard deduction for your filing status — reduces taxable income (includes age 65+ bonus if applicable)`,
  "Overtime Deduction (OBBBA)": "Deduction for the 0.5x premium portion of overtime pay under the OBBBA (2026-2028)",
  "Tip Income Deduction (OBBBA)": "Deduction for tip income under the OBBBA (2026-2028)",
  "Senior Deduction (OBBBA)": "Additional deduction for taxpayers and spouses age 65+ under OBBBA (2026-2028)",
  "Taxable Income": "AGI minus standard deduction and any other deductions — the amount federal income tax is calculated on",
  "Gross Tax": "Federal income tax before any credits, based on progressive tax brackets",
  "Child Tax Credit": "Nonrefundable credit of $2,200 per child under age 17 (updated under OBBBA)",
  "After CTC": "Gross federal tax minus Child Tax Credit — shows remaining tax liability before other credits",
  "Saver's Credit": "Nonrefundable credit for contributions to retirement accounts; percentage varies by AGI",
  "Net Federal Tax": "Final federal income tax after all nonrefundable credits — taxes you owe before refundable credits",
  "Child & Dependent Care Credit": "Credit for expenses for childcare and dependent care, percentage varies by AGI (OBBBA-enhanced for 2026+)",
  "ACTC (refundable)": "Refundable portion of Child Tax Credit — can reduce tax owed below zero and result in refund",
  "Earned Income Credit (refundable)": "Refundable credit for lower-income workers with or without children — can generate a refund",
  "Social Security + Medicare": "FICA taxes (6.2% Social Security + 1.45% Medicare) on wages",
  "Spouse FICA": "Spouse's FICA taxes on their wages",
  "Maine Income (excl. PFML)": "W-2 wages and other income subject to Maine state tax (excludes PFML benefits)",
  "Maine Taxable Income": "Maine income after standard deduction and exemptions — amount Maine income tax is calculated on",
  "Maine Gross Tax": "Maine state income tax before credits, based on Maine progressive tax brackets",
  "Maine EITC": "Maine's earned income tax credit — refundable credit for lower-income workers",
  "Student Loan Repayment Credit": "Maine credit for student loan payments (up to payment amount, limited per tax year)",
  "Dependent Exemption Credit ($300/dep)": "Maine credit of $300 per dependent — replaces the dependent exemption",
  "Property Tax Fairness Credit": "Maine credit based on rent or property taxes if income is below threshold",
  "Sales Tax Fairness Credit": "Maine credit to offset sales taxes paid; amount depends on income level",
  "Maine Net": "Maine tax after all credits — positive means you owe, negative means you benefit",
  "Estimated Refund": "Amount you will receive back from federal and Maine governments combined",
  "Estimated Owed": "Amount of additional federal and Maine taxes you will owe at tax time",
  "Annual Take-Home": "Gross income minus federal tax, FICA tax, Maine tax, and all pre-tax deductions",
  "Retirement Contributions": "Sum of 401(k) and HSA contributions — amounts set aside for retirement/medical savings",
  "Gross Wages": "Total wages earned before any taxes or deductions",
  "Weekly Work Take-Home": "Your paycheck amount per week: gross wages minus federal tax, FICA tax, Maine tax, health insurance, 401k, and HSA deductions",
  "Monthly Take-Home": "Total monthly income available after all federal, state, and FICA taxes plus pre-tax deductions (401k, HSA, insurance)",
  "Monthly Surplus": "Monthly take-home minus your monthly expenses — the amount left over each month after taxes, deductions, and fixed expenses",
  "Weekly PFML Take-Home": "Your income during PFML leave: PFML benefit minus federal tax (PFML is FICA-exempt and Maine-exempt)",
};

// ============================================================
// APP
// ============================================================
export default function App() {
const [i, setI] = useState({
filingStatus: "MFJ", payType: "hourly",
hourlyRate: 0, hoursPerWeek: 40, otHours: 0, salary: 0,
numKidsUnder17: 0, numKidsUnder6: 0, age65: false, spouseAge65: false,
numKidsUnder13: 0, childcareExpenses: 0, annualTips: 0,
spouseIncome: 0, spouseTrad401kPct: 0, spouseRetire: 0,
otherIncome: 0,
housingType: "rent", monthlyHousing: 0, rentIncHeat: true, annualPropTax: 0,
monthlyExpenses: 0,
slInterest: 0, slPayments: 0,
trad401kPct: 0, roth401kPct: 0,
hsaEligible: false, hsaTier: "self", hsaContrib: 0,
healthPremium: 0,
weeklyAfterTax: 0,
pfmlWeeks: 0,
});
const [tab, setTab] = useState("about");
const [scenA, setScenA] = useState(null);
const [scenB, setScenB] = useState(null);

const u = k => v => setI(p => ({ ...p, [k]: v }));
const hasInc = i.payType === "hourly" ? i.hourlyRate > 0 : i.salary > 0;
const r = hasInc ? calc(i) : null;

const blank = { filingStatus:"MFJ",payType:"hourly",hourlyRate:0,hoursPerWeek:40,otHours:0,salary:0,numKidsUnder17:0,numKidsUnder6:0,age65:false,spouseAge65:false,numKidsUnder13:0,childcareExpenses:0,annualTips:0,spouseIncome:0,spouseTrad401kPct:0,spouseRetire:0,otherIncome:0,housingType:"rent",monthlyHousing:0,rentIncHeat:true,annualPropTax:0,monthlyExpenses:0,slInterest:0,slPayments:0,trad401kPct:0,roth401kPct:0,hsaEligible:false,hsaTier:"self",hsaContrib:0,healthPremium:0,weeklyAfterTax:0,pfmlWeeks:0 };

const tabs = [
{ id: "about", label: "About" },
{ id: "input", label: "Inputs" },
{ id: "results", label: "Overview" },
{ id: "breakdown", label: "Detail" },
  { id: "compare", label: "Take Home / Compare" },
const thr = { ...tds, fontWeight: 700, color: C.navy, textAlign: "right", fontFamily: mono };

return (
<div style={{ fontFamily: font, maxWidth: 860, margin: "0 auto", padding: "0 16px 40px", background: C.bg, minHeight: "100vh", color: C.text, WebkitFontSmoothing: 'antialiased' }}>
<style>{printCSS}</style>

  {/* Header */}
  <div style={{ padding: "20px 0 16px", borderBottom: `2px solid ${C.navy}`, marginBottom: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Personal Tax Planning</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: C.navy, letterSpacing: "-0.01em" }}>Maine 2026 Tax Year</div>
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {r && (
        <div style={{ textAlign: "right" }} className="no-print">
          <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Estimated Refund</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.green, fontFamily: mono, letterSpacing: "-0.02em" }}>{f$(r.tr)}</div>
        </div>
      )}
      {r && (tab === "results" || tab === "breakdown" || tab === "compare") && (
        <button className="no-print" onClick={() => window.print()} style={{
          padding: "10px 16px", background: C.white, color: C.navy, border: `1px solid ${C.border}`,
          borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
          letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 6, minHeight: 40,
        }}>
          Print
        </button>
      )}
    </div>
  </div>

  {/* Nav */}
  <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: `1px solid ${C.border}`, overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: 'touch', alignItems: "stretch" }}>
    <div className="tabs-container" style={{ display: "flex", gap: 0, overflowX: "auto", WebkitOverflowScrolling: 'touch' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          padding: "10px 12px", fontSize: '10px', fontWeight: 600, cursor: "pointer",
          letterSpacing: "0.03em", textTransform: "uppercase",
          background: "transparent", color: tab === t.id ? C.navy : C.textMuted,
          border: "none", borderBottom: tab === t.id ? `3px solid ${C.navy}` : "3px solid transparent",
          transition: "all 0.15s", fontFamily: font, minHeight: 44, whiteSpace: 'nowrap', flex: "0 0 auto",
        }}>{t.label}</button>
      ))}
    </div>
    <div style={{ flex: 1, minWidth: 8 }} />
    <button className="no-print" onClick={() => { setI(blank); setScenA(null); setScenB(null); }} style={{
      padding: "8px 10px", fontSize: '10px', fontWeight: 600, cursor: "pointer",
      background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`,
      borderRadius: 4, fontFamily: font, letterSpacing: "0.03em", minHeight: 44, flexShrink: 0, whiteSpace: 'nowrap',
    }}>Reset</button>
  </div>

  {/* ==================== ABOUT ==================== */}
  {tab === "about" && (
    <div>
      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "12px 16px", background: C.white, borderRadius: 4, border: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Jesse M. Higgins · Bath/Brunswick, Maine</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Financial Analyst at General Dynamics Bath Iron Works</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>Pursuing MS Computer Science at Northeastern University</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Built with Claude AI (Anthropic) · 2026</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="https://github.com/JesseHiggins/Maine-Tax-Planner-2026" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: C.blue, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 4 }}>GitHub</a>
          <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: C.blue, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 4 }}>LinkedIn</a>
        </div>
      </div>

      <div style={{ padding: "28px 0 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Portfolio Project</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.navy, lineHeight: 1.3, maxWidth: 520, margin: "0 auto" }}>
          A Maine-Specific Tax Planning Engine Built with AI
        </div>
        <div style={{ fontSize: 14, color: C.textSec, marginTop: 12, maxWidth: 480, margin: "12px auto 0", lineHeight: 1.7 }}>
          Designed and developed using Claude AI to solve a real problem -- helping Maine workers navigate federal and state tax optimization.
        </div>
        <button className="no-print" onClick={() => setTab("input")} style={{
          marginTop: 24, padding: "14px 40px", background: C.navy, color: "#fff", border: "none", borderRadius: 4,
          fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: font, minHeight: 48,
        }}>Try the Planner  --</button>
      </div>

      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { num: "01", title: "The Problem", body: "Maine residents face a complex intersection of federal brackets, state credits, PFML benefits, and retirement optimization. Existing tools don't account for Maine-specific provisions like the Student Loan Repayment Credit or Sales Tax Fairness Credit." },
          { num: "02", title: "The Approach", body: "Used Claude AI as a collaborative development partner to architect a complete 2026 tax engine -- from IRS revenue procedures and Maine tax law through to an interactive planning interface. Every bracket, credit, and phase-out is sourced from published guidance." },
          { num: "03", title: "The Result", body: "A working application that calculates federal, FICA, and Maine taxes in real time, surfaces actionable insights on credit eligibility and retirement trade-offs, and provides a scenario comparison tool for decision-making." },
        ].map(c => (
          <div key={c.num} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 4, padding: "20px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: "0.08em", marginBottom: 8 }}>{c.num}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.7 }}>{c.body}</div>
          </div>
        ))}
      </div>

      <Card title="What the Engine Covers">
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Federal Income Tax", detail: "2026 brackets, standard deduction, CTC, ACTC, Saver's Credit, EITC" },
            { label: "OBBBA Provisions", detail: "Overtime deduction, tip income deduction, senior deduction, enhanced childcare credit, updated CTC ($2,200)" },
            { label: "Maine State Tax", detail: "Brackets, PTFC, STFC, Student Loan Repayment Credit, dependent exemption, Maine EITC" },
            { label: "Paid Family Leave", detail: "Maine PFML benefit calculation, weekly take-home comparison" },
            { label: "Retirement Planning", detail: "Traditional vs. Roth 401(k), HSA, spousal IRA, Saver's Credit tiers" },
            { label: "Cash Flow Analysis", detail: "Weekly take-home, monthly surplus, marginal rate optimization" },
          ].map((item, idx) => (
            <div key={idx} style={{ padding: "12px 14px", background: C.cardAlt, borderRadius: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{item.label}</div>
              <div style={{ fontSize: 11, color: C.textSec, marginTop: 2, lineHeight: 1.5 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="How It Was Built">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { step: "Research", desc: "Compiled 2026 tax parameters from IRS Rev. Proc. 2025-32, IRS Notice 2025-67, OBBBA provisions, and Maine Revenue Services publications." },
            { step: "Architecture", desc: "Collaborated with Claude AI to design a pure-JavaScript tax engine handling progressive brackets, credit phase-outs, and benefit calculations with no external dependencies." },
            { step: "Interface", desc: "Iteratively designed a responsive React application with real-time calculations, visual allocation breakdowns, and contextual optimization insights." },
            { step: "Validation", desc: "Cross-referenced outputs against manual calculations and published tax tables to verify accuracy across filing statuses and income levels." },
            { step: "DevOps", desc: "Developed entirely in GitHub Codespaces with Claude AI as development partner. Built with Vite for fast development and optimized production bundles. Version controlled with Git, deployed to Vercel with automatic HTTPS, global CDN, and zero-config deployment." },
          ].map((s, idx) => (
            <div key={idx} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: idx < 4 ? `1px solid ${C.borderLight}` : "none" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, minWidth: 80, textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: 1 }}>{s.step}</div>
              <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card title="Technology">
          <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.8 }}>
            React · JavaScript · Vite · Claude AI
            <br />GitHub · Codespaces · Vercel
            <br />No backend required -- all calculations run client-side.
          </div>
        </Card>
        <Card title="Source Authority">
          <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.8 }}>
            IRS Revenue Procedure 2025-32
            <br />IRS Notice 2025-67 (CTC/ACTC)
            <br />OBBBA  70101-70412 (brackets, OT, tips, senior, CDCTC)
            <br />Maine Revenue Services -- 2026 Tax Year
            <br />36 M.R.S. 5219-SS (dependent credit)
            <br />26 M.R.S.  850-L (PFML exemption)
          </div>
        </Card>
      </div>

      <div className="no-print" style={{ textAlign: "center", padding: "20px 0" }}>
        <button onClick={() => setTab("input")} style={{
          padding: "12px 48px", background: C.navy, color: "#fff", border: "none", borderRadius: 4,
          fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: font,
        }}>Get Started  --</button>
      </div>
    </div>
  )}

  {/* ==================== INPUTS ==================== */}
  {tab === "input" && (
    <div>
      <Card title="Filing Status">
        <Toggle options={[{v:"S",l:"Single"},{v:"MFJ",l:"Married Filing Jointly"},{v:"HOH",l:"Head of Household"}]} val={i.filingStatus} set={u("filingStatus")} />
        <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
          <Field label="Dependents under 17" tip="Child Tax Credit -- $2,200 each"><Num val={i.numKidsUnder17} set={u("numKidsUnder17")} pre="" w={56} max={10} /></Field>
          <Field label="Dependents under 13" tip="Child & Dependent Care Credit"><Num val={i.numKidsUnder13} set={u("numKidsUnder13")} pre="" w={56} max={10} /></Field>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSec, cursor: "pointer" }}>
            <input type="checkbox" checked={i.age65} onChange={e => u("age65")(e.target.checked)} style={{ accentColor: C.navy, width: 14, height: 14, flexShrink: 0 }} /> Taxpayer age 65+
          </label>
          {i.filingStatus === "MFJ" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSec, cursor: "pointer" }}>
              <input type="checkbox" checked={i.spouseAge65} onChange={e => u("spouseAge65")(e.target.checked)} style={{ accentColor: C.navy, width: 14, height: 14, flexShrink: 0 }} /> Spouse age 65+
            </label>
          )}
        </div>
      </Card>

      <Card title="Compensation">
        <Field label="Pay Structure">
          <Toggle options={[{v:"hourly",l:"Hourly"},{v:"salary",l:"Salary"}]} val={i.payType} set={u("payType")} />
        </Field>
        {i.payType === "hourly" ? (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Field label="Hourly Rate"><Num val={i.hourlyRate} set={u("hourlyRate")} step={0.25} /></Field>
            <Field label="Hours per Week"><Num val={i.hoursPerWeek} set={u("hoursPerWeek")} pre="" w={56} /></Field>
            <Field label="Avg. OT per Week" tip="At 1.5x rate -- premium portion deductible under OBBBA"><Num val={i.otHours} set={u("otHours")} pre="" w={56} step={0.5} /></Field>
          </div>
        ) : (
          <Field label="Annual Salary"><Num val={i.salary} set={u("salary")} w={130} /></Field>
        )}
        {i.filingStatus === "MFJ" && (
          <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 14, marginTop: 10 }}>
            <Field label="Spouse W-2 Income"><Num val={i.spouseIncome} set={u("spouseIncome")} w={130} /></Field>
          </div>
        )}
        <Field label="Other Annual Income" tip="Interest, dividends, side income">
          <Num val={i.otherIncome} set={u("otherIncome")} w={130} />
        </Field>
        <Field label="Annual Tip Income" tip="OBBBA deduction -- up to $25,000 ($50,000 MFJ)">
          <Num val={i.annualTips} set={u("annualTips")} w={130} />
        </Field>
      </Card>

      {(i.numKidsUnder13||0) > 0 && (
        <Card title="Childcare" sub="Child & Dependent Care Credit -- OBBBA enhanced to 50% of expenses (nonrefundable)">
          <Field label="Annual Childcare Expenses" tip={`Max eligible: ${f$((i.numKidsUnder13||0) >= 2 ? 6000 : 3000)} for ${i.numKidsUnder13} child${(i.numKidsUnder13||0)>1?"ren":""} under 13`}>
            <Num val={i.childcareExpenses} set={u("childcareExpenses")} w={130} max={(i.numKidsUnder13||0) >= 2 ? 6000 : 3000} />
          </Field>
        </Card>
      )}

      <Card title="Housing">
        <Field label="Tenure">
          <Toggle options={[{v:"rent",l:"Renter"},{v:"own",l:"Owner"}]} val={i.housingType} set={u("housingType")} />
        </Field>
        {i.housingType === "rent" ? (<>
          <Field label="Monthly Rent"><Num val={i.monthlyHousing} set={u("monthlyHousing")} /></Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSec, cursor: "pointer" }}>
            <input type="checkbox" checked={i.rentIncHeat} onChange={e => u("rentIncHeat")(e.target.checked)} style={{ accentColor: C.navy, width: 14, height: 14 }} /> Rent includes heat and utilities
          </label>
        </>) : (
          <Field label="Annual Property Tax"><Num val={i.annualPropTax} set={u("annualPropTax")} w={130} /></Field>
        )}
        <div style={{ marginTop: 10 }}>
          <Field label="Total Monthly Expenses" tip="All spending including housing, food, insurance"><Num val={i.monthlyExpenses} set={u("monthlyExpenses")} w={130} /></Field>
        </div>
      </Card>

      <Card title="Retirement & Benefits">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Field label="Traditional 401(k)"><Num val={i.trad401kPct} set={u("trad401kPct")} pre="%" w={56} max={100} /></Field>
          <Field label="Roth 401(k)"><Num val={i.roth401kPct} set={u("roth401kPct")} pre="%" w={56} max={100} /></Field>
          <Field label="Health Premium / Wk"><Num val={i.healthPremium} set={u("healthPremium")} step={0.01} w={80} /></Field>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSec, cursor: "pointer", marginBottom: 10 }}>
            <input type="checkbox" checked={i.hsaEligible} onChange={e => u("hsaEligible")(e.target.checked)} style={{ accentColor: C.navy, width: 14, height: 14, flexShrink: 0 }} /> HSA-eligible plan
          </label>
          {i.hsaEligible && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingLeft: 2 }}>
              <Field label="Coverage Tier">
                <Toggle options={[{v:"self",l:`Self (${f$(HSA_L.self)})`},{v:"family",l:`Family (${f$(HSA_L.family)})`}]} val={i.hsaTier} set={u("hsaTier")} />
              </Field>
              <Field label="Annual HSA Contribution"><Num val={i.hsaContrib} set={u("hsaContrib")} w={100} max={HSA_L[i.hsaTier]} /></Field>
            </div>
          )}
        </div>
        {i.filingStatus === "MFJ" && i.spouseIncome > 0 && (
          <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 12, marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Field label="Spouse Trad 401(k)"><Num val={i.spouseTrad401kPct} set={u("spouseTrad401kPct")} pre="%" w={56} max={100} /></Field>
            <Field label="Spouse Roth IRA / Yr"><Num val={i.spouseRetire} set={u("spouseRetire")} w={100} max={7500} /></Field>
          </div>
        )}
        <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 12, marginTop: 10 }}>
          <Field label="After-Tax Deductions / Wk" tip="LTD, union dues, other post-tax payroll deductions"><Num val={i.weeklyAfterTax} set={u("weeklyAfterTax")} step={0.01} w={80} /></Field>
        </div>
      </Card>

      <Card title="Student Loans">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Field label="Annual Interest Paid" tip="Federal deduction -- up to $2,500"><Num val={i.slInterest} set={u("slInterest")} max={2500} /></Field>
          <Field label="Annual Payments" tip="Maine credit -- payments up to $2,500"><Num val={i.slPayments} set={u("slPayments")} max={2500} /></Field>
        </div>
      </Card>

      <Card title="Paid Family & Medical Leave" sub="Maine PFML -- up to 12 weeks. Benefits are federally taxable, FICA-exempt, and Maine-exempt in 2026.">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <input type="range" min={0} max={12} value={i.pfmlWeeks} onChange={e => u("pfmlWeeks")(+e.target.value)} style={{ flex: 1, accentColor: C.navy, height: 4 }} />
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: i.pfmlWeeks > 0 ? C.navy : C.textMuted, minWidth: 65, textAlign: "right" }}>
            {i.pfmlWeeks === 0 ? "0 wks" : `${i.pfmlWeeks} wks`}
          </span>
        </div>
        {i.pfmlWeeks > 0 && r && (
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <KPI label="Benefit / Week" val={f$(Math.round(r.pfmlBen))} color={C.blue} />
            <KPI label="Work Take-Home" val={f$(Math.round(r.wth))} />
            <KPI label="Leave Take-Home" val={f$(Math.round(r.pth))} />
          </div>
        )}
      </Card>

      {hasInc && (
        <div className="no-print" style={{ textAlign: "center", padding: "12px 0 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <button onClick={() => setTab("results")} style={{
            padding: "12px 48px", background: C.navy, color: "#fff", border: "none", borderRadius: 4,
            fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: font,
          }}>View Results  --</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setScenA({ inputs: { ...i }, results: calc(i) }); }} style={{
              padding: "8px 20px", background: scenA ? C.bluePale : C.white, color: C.navy, border: `1px solid ${scenA ? C.blue : C.border}`,
              borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
            }}>Save as Scenario A{scenA ? " Y" : ""}</button>
            <button onClick={() => { setScenB({ inputs: { ...i }, results: calc(i) }); }} style={{
              padding: "8px 20px", background: scenB ? C.bluePale : C.white, color: C.navy, border: `1px solid ${scenB ? C.blue : C.border}`,
              borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
            }}>Save as Scenario B{scenB ? " Y" : ""}</button>
          </div>
          {(scenA || scenB) && (
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {scenA && scenB ? "Both scenarios saved -- " : scenA ? "Scenario A saved. Change inputs and save B to compare -- " : "Scenario B saved. Change inputs and save A to compare -- "}
              {scenA && scenB && <button onClick={() => setTab("compare")} style={{ background: "none", border: "none", color: C.blue, fontWeight: 600, cursor: "pointer", fontSize: 11, fontFamily: font, padding: 0 }}>View Comparison  --</button>}
            </div>
          )}
        </div>
      )}
    </div>
  )}

  {/* ==================== OVERVIEW ==================== */}
  {tab === "results" && r && (
    <div>
      <div className="flex-kpi" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Est. Refund" val={f$(r.tr)} color={C.green} accent={C.greenPale} />
        <KPI label="Monthly Take-Home" val={f$(Math.round(r.mt))} color={C.navy} />
        <KPI label="Monthly Surplus" val={f$(Math.round(r.ms))} color={r.ms >= 0 ? C.green : C.red} accent={r.ms >= 0 ? C.greenPale : C.redPale} />
        <KPI label="Marginal Rate" val={(r.mr*100).toFixed(0)+"%"} color={C.amber} accent={C.amberPale} />
      </div>

      <Card title="Annual Income Allocation">
        {(() => {
          const gross = r.ag + r.ap + (i.spouseIncome||0) + (i.otherIncome||0);
          return (<>
            <HBar label="Federal Tax" val={Math.max(0, r.nf - r.cdctc - r.actc - r.eitc)} max={gross} color={C.red} />
            <HBar label="FICA" val={Math.round(r.mf + r.sf)} max={gross} color="#D97706" />
            <HBar label="Maine Tax (net)" val={Math.max(0, -r.mn)} max={gross} color={C.amber} />
            <HBar label="Retirement" val={Math.round(r.tre)} max={gross} color={C.blue} />
            <HBar label="Health & Insurance" val={Math.round(r.hp)} max={gross} color="#7C3AED" />
            <HBar label="Net Take-Home" val={Math.round(r.an)} max={gross} color={C.green} />
          </>);
        })()}
      </Card>

      <Card title="Credits & Deductions Applied">
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            r.eitc > 0 && { l: "Earned Income Credit", v: f$(r.eitc), d: "Federal -- refundable" },
            r.meEitc > 0 && { l: "Maine EITC", v: f$(r.meEitc), d: `${i.numKidsUnder17 > 0 ? "25" : "50"}% of federal` },
            r.ctc > 0 && { l: "Child Tax Credit", v: f$(r.ctc), d: `${i.numKidsUnder17} x $2,200` },
            r.actc > 0 && { l: "ACTC (refundable)", v: f$(r.actc) },
            r.otDed > 0 && { l: "Overtime Deduction", v: f$(r.otDed), d: "OBBBA -- reduces taxable income" },
            r.tipDed > 0 && { l: "Tip Income Deduction", v: f$(r.tipDed), d: "OBBBA -- reduces taxable income" },
            r.seniorDed > 0 && { l: "Senior Deduction", v: f$(r.seniorDed), d: "OBBBA 2025-2028" },
            r.cdctc > 0 && { l: "Child Care Credit", v: f$(r.cdctc), d: "OBBBA enhanced -- nonrefundable" },
            r.su > 0 && { l: "Saver's Credit", v: f$(r.su), d: `${fp(r.sr)} tier` },
            r.pc > 0 && { l: "Property Tax Fairness", v: f$(r.pc) },
            r.sc > 0 && { l: "Sales Tax Fairness", v: f$(r.sc) },
            r.sl > 0 && { l: "Student Loan Repayment", v: f$(r.sl) },
            r.dc > 0 && { l: "ME Dependent Credit", v: f$(r.dc), d: `${i.numKidsUnder17} x $300` },
          ].filter(Boolean).map((c, j) => (
            <div key={j} style={{ padding: "12px 14px", background: C.cardAlt, borderRadius: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.green, fontFamily: mono }}>{c.v}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textSec, marginTop: 2 }}>{c.l}</div>
              {c.d && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{c.d}</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Key Findings">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {r.otDed > 0 && (
            <div style={{ padding: "12px 16px", background: C.greenPale, borderRadius: 4, borderLeft: `3px solid ${C.green}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>OBBBA Overtime Deduction active.</strong> Your {f$(Math.round(r.otPremium))} in overtime premium pay qualifies for a {f$(r.otDed)} deduction, saving approximately {f$(Math.round(r.otDed * r.mr))} in combined taxes.
            </div>
          )}
          {r.tipDed > 0 && (
            <div style={{ padding: "12px 16px", background: C.greenPale, borderRadius: 4, borderLeft: `3px solid ${C.green}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>OBBBA Tip Deduction active.</strong> {f$(r.tipDed)} in tip income deducted from federal taxable income, saving approximately {f$(Math.round(r.tipDed * r.mr))}.
            </div>
          )}
          {r.seniorDed > 0 && (
            <div style={{ padding: "12px 16px", background: C.bluePale, borderRadius: 4, borderLeft: `3px solid ${C.blue}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>Senior Deduction applied.</strong> {f$(r.seniorDed)} OBBBA deduction for age 65+ reduces your federal taxable income through 2028.
            </div>
          )}
          {r.cdctc > 0 && (
            <div style={{ padding: "12px 16px", background: C.greenPale, borderRadius: 4, borderLeft: `3px solid ${C.green}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>Child Care Credit: {f$(r.cdctc)}.</strong> OBBBA-enhanced credit at up to 50% of {f$(i.childcareExpenses)} in qualifying expenses. Nonrefundable -- applied against your federal tax.
            </div>
          )}
          {r.eitc > 0 && (
            <div style={{ padding: "12px 16px", background: C.greenPale, borderRadius: 4, borderLeft: `3px solid ${C.green}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>Earned Income Credit: {f$(r.eitc)} federal + {f$(r.meEitc)} Maine.</strong> Combined {f$(r.eitc + r.meEitc)} in refundable credits based on your earned income and {i.numKidsUnder17} qualifying {i.numKidsUnder17 === 1 ? "child" : "children"}.
            </div>
          )}
          {r.t4 === 0 && r.r4 === 0 && (
            <div style={{ padding: "12px 16px", background: C.bluePale, borderRadius: 4, borderLeft: `3px solid ${C.blue}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>No retirement contributions detected.</strong> A 3% traditional 401(k) deferral ({f$(Math.round(r.ag*.03))}/yr) would save approximately {f$(Math.round(r.ag*.03*r.mr))} in annual taxes.
            </div>
          )}
          {r.sr > 0 && r.aCTC > r.su && r.sq === 0 && i.filingStatus === "MFJ" && (
            <div style={{ padding: "12px 16px", background: C.greenPale, borderRadius: 4, borderLeft: `3px solid ${C.green}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>Saver's Credit capacity available.</strong> A spouse Roth IRA contribution up to $2,000 could generate an additional {f$(Math.round(Math.min(2000, r.aCTC - r.su) * r.sr))} credit at the {fp(r.sr)} tier.
            </div>
          )}
          {i.hsaEligible && r.hc < r.hl && (
            <div style={{ padding: "12px 16px", background: C.bluePale, borderRadius: 4, borderLeft: `3px solid ${C.blue}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
              <strong>HSA not maximized.</strong> Contributing {f$(r.hl - r.hc)} more would save approximately {f$(Math.round((r.hl - r.hc) * r.hr))} in combined taxes.
            </div>
          )}
          <div style={{ padding: "12px 16px", background: C.cardAlt, borderRadius: 4, fontSize: 12, color: C.textSec, lineHeight: 1.7 }}>
            Combined marginal rate: {(r.mr*100).toFixed(1)}% -- federal {r.fti <= FED[i.filingStatus].bk[0][0] ? "10" : "12"}% + Maine {r.mti <= ME[i.filingStatus].bk[0][0] ? "5.8" : "6.75"}% + FICA 7.65%. Each additional pre-tax dollar saves approximately {Math.round(r.mr*100)}¢.
          </div>
        </div>
      </Card>
    </div>
  )}

  {/* ==================== DETAIL ==================== */}
  {tab === "breakdown" && r && (
    <Card noPad>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
        {[
          { h: "Income" },
          { l: "W-2 Wages", v: r.w2 },
          r.ap > 0 && { l: "PFML Benefits", v: r.ap, c: C.blue },
          i.spouseIncome > 0 && { l: "Spouse Income", v: i.spouseIncome - r.spt },
          i.otherIncome > 0 && { l: "Other Income", v: i.otherIncome },
          { l: "Total Income (Line 9)", v: r.ln9, b: true },
          r.sl > 0 && { l: "Student Loan Interest Deduction", v: -Math.min(i.slInterest, 2500) },
          { l: "Adjusted Gross Income", v: r.agi, b: true },
          { h: "Federal" },
          { l: "Standard Deduction", v: -FED[i.filingStatus].std },
          r.otDed > 0 && { l: "Overtime Deduction (OBBBA)", v: -r.otDed, c: C.green },
          r.tipDed > 0 && { l: "Tip Income Deduction (OBBBA)", v: -r.tipDed, c: C.green },
          r.seniorDed > 0 && { l: "Senior Deduction (OBBBA)", v: -r.seniorDed, c: C.green },
          { l: "Taxable Income", v: r.fti },
          { l: "Gross Tax", v: r.fg },
          r.ctc > 0 && { l: "Child Tax Credit", v: -r.ctc, c: C.green },
          { l: "After CTC", v: r.aCTC },
          r.su > 0 && { l: `Saver's Credit (${fp(r.sr)})`, v: -r.su, c: C.green },
          { l: "Net Federal Tax", v: r.nf, b: true },
          r.cdctc > 0 && { l: "Child & Dependent Care Credit", v: -r.cdctc, c: C.green },
          r.actc > 0 && { l: "ACTC (refundable)", v: r.actc, c: C.green },
          r.eitc > 0 && { l: "Earned Income Credit (refundable)", v: r.eitc, c: C.green },
          { h: "FICA" },
          { l: "Social Security + Medicare", v: Math.round(r.mf) },
          r.sf > 0 && { l: "Spouse FICA", v: Math.round(r.sf) },
          { h: "Maine" },
          { l: "Maine Income (excl. PFML)", v: r.mi },
          { l: "Maine Taxable Income", v: r.mti },
          { l: "Maine Gross Tax", v: r.mg },
          r.meEitc > 0 && { l: "Maine EITC", v: -r.meEitc, c: C.green },
          r.sl > 0 && { l: "Student Loan Repayment Credit", v: -r.sl, c: C.green },
          r.dc > 0 && { l: "Dependent Exemption Credit ($300/dep)", v: -r.dc, c: C.green },
          r.pc > 0 && { l: "Property Tax Fairness Credit", v: -r.pc, c: C.green },
          r.sc > 0 && { l: "Sales Tax Fairness Credit", v: -r.sc, c: C.green },
          { l: "Maine Net", v: r.mn, b: true, c: r.mn > 0 ? C.green : C.red },
          { h: "Summary" },
          { l: "Estimated Refund", v: r.tr, b: true, c: C.green },
          r.to > 0 && { l: "Estimated Owed", v: r.to, b: true, c: C.red },
          { l: "Annual Take-Home", v: Math.round(r.an), b: true },
          { l: "Retirement Contributions", v: Math.round(r.tre), c: C.blue },
        ].filter(Boolean).map((row, j) => {
          if (row.h) return (
            <tr key={j}><td colSpan={2} style={{ padding: "14px 20px 8px", fontWeight: 700, fontSize: 11, color: C.navy, borderBottom: `2px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.08em", background: C.cardAlt }}>{row.h}</td></tr>
          );
          const hasTooltip = tooltips[row.l];
          return (
            <tr key={j} style={{ background: row.b ? C.cardAlt : "transparent" }}>
              <td style={{ ...tds, fontWeight: row.b ? 700 : 400, color: row.b ? C.navy : C.textSec }}>
                {hasTooltip ? (
                  <Tooltip text={tooltips[row.l]}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div>{row.l}</div>
                      <div style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 700 }}>?</div>
                    </div>
                  </Tooltip>
                ) : row.l}
              </td>
              <td style={{ ...tdr, fontWeight: row.b ? 700 : 500, color: row.c || (row.b ? C.navy : C.text) }}>{f$(Math.round(row.v))}</td>
            </tr>
          );
        })}
      </tbody></table>
    </Card>
  )}

  {/* ==================== TAKE HOME / COMPARE ==================== */}
  {tab === "compare" && (
    <div>
      {!scenA && !scenB ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 600, marginBottom: 8 }}>No scenarios saved yet</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Go to Inputs, configure a scenario, and save it as A. To compare, change the inputs and save another as B.</div>
          <button onClick={() => setTab("input")} style={{
            padding: "10px 32px", background: C.navy, color: "#fff", border: "none", borderRadius: 4,
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>Go to Inputs  --</button>
        </div>
      ) : (() => {
        // Single scenario or comparison mode
        const single = scenA && !scenB;
        const a = scenA?.results, b = scenB?.results, ai = scenA?.inputs, bi = scenB?.inputs;
        const a = scenA.results, b = scenB.results, ai = scenA.inputs, bi = scenB.inputs;
        const delta = (va, vb) => { const d = vb - va; return d === 0 ? "--" : (d > 0 ? "+" : "") + f$(Math.round(d)); };
        const dColor = (va, vb, invert) => { const d = vb - va; if (d === 0) return C.textMuted; return (invert ? d < 0 : d > 0) ? C.green : C.red; };
        const scenLabel = (inp) => {
          const pay = inp.payType === "hourly" ? `$${inp.hourlyRate}/hr` : f$(inp.salary) + "/yr";
          const parts = [pay];
          if (inp.trad401kPct > 0 || inp.roth401kPct > 0) parts.push(`401k ${inp.trad401kPct}%T/${inp.roth401kPct}%R`);
          if (inp.pfmlWeeks > 0) parts.push(`${inp.pfmlWeeks}wk PFML`);
          if (inp.hsaContrib > 0) parts.push(`HSA ${f$(inp.hsaContrib)}`);
          return parts.join(" · ");
        };
        
        // Single scenario view
        if (single) {
          return (
            <>
              <div style={{ padding: "14px 16px", background: C.bluePale, borderRadius: 4, borderLeft: `3px solid ${C.blue}`, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current Scenario</div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{scenLabel(ai)}</div>
              </div>

              <div className="flex-kpi" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {[
                  { l: "Refund", v: a.tr, tip: "Expected refund from federal and state" },
                  { l: "Weekly Take-Home", v: Math.round(a.wth), tip: "Gross pay minus taxes and deductions" },
                  { l: "Monthly Take-Home", v: Math.round(a.mt), tip: "Average monthly income after taxes" },
                  { l: "Monthly Surplus", v: Math.round(a.ms), tip: "Monthly take-home minus expenses" },
                ].map((k, idx) => (
                  <Tooltip key={idx} text={k.tip}>
                    <div style={{ flex: 1, minWidth: 130, padding: "14px 16px", background: C.white, borderRadius: 4, border: `1px solid ${C.border}`, textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.l}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: C.navy }}>{f$(k.v)}</div>
                    </div>
                  </Tooltip>
                ))}
              </div>

              <Card noPad>
                <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
                  {[
                    { h: "Income" },
                    { l: "Gross Wages", v: a.ag },
                    a.ap > 0 && { l: "PFML Benefits", v: a.ap },
                    { l: "Adjusted Gross Income", v: a.agi, bold: true },
                    { h: "Cash Flow" },
                    { l: "Weekly Work Take-Home", v: Math.round(a.wth) },
                    { l: "Monthly Take-Home", v: Math.round(a.mt), bold: true },
                    { l: "Monthly Surplus", v: Math.round(a.ms), bold: true },
                    a.ww < 52 && { l: "Weekly Leave Take-Home (PFML)", v: Math.round(a.pth) },
                    { h: "Taxes" },
                    { l: "Net Federal Tax", v: a.nf },
                    { l: "FICA", v: Math.round(a.mf) },
                    { l: "Maine Gross Tax", v: a.mg },
                    { h: "Summary" },
                    { l: "Estimated Refund", v: a.tr, bold: true },
                    { l: "Retirement Contributions", v: Math.round(a.tre) },
                    { l: "Marginal Rate", v: null, custom: true, av: (a.mr*100).toFixed(1)+"%" },
                  ].filter(Boolean).map((row, j) => {
                    if (row.h) return (
                      <tr key={j}><td colSpan={2} style={{ padding: "14px 20px 8px", fontWeight: 700, fontSize: 11, color: C.navy, borderBottom: `2px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.08em", background: C.cardAlt }}>{row.h}</td></tr>
                    );
                    if (row.custom) return (
                      <tr key={j}>
                        <td style={{ ...tds, color: C.textSec }}>{row.l}</td>
                        <td style={{ ...tdr }}>{row.av}</td>
                      </tr>
                    );
                    const hasTooltip = tooltips[row.l];
                    return (
                      <tr key={j} style={{ background: row.bold ? C.cardAlt : "transparent" }}>
                        <td style={{ ...tds, fontWeight: row.bold ? 700 : 400, color: row.bold ? C.navy : C.textSec }}>
                          {hasTooltip ? (
                            <Tooltip text={tooltips[row.l]}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div>{row.l}</div>
                                <div style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 700 }}>?</div>
                              </div>
                            </Tooltip>
                          ) : row.l}
                        </td>
                        <td style={{ ...tdr, fontWeight: row.bold ? 700 : 500, color: row.bold ? C.navy : C.text }}>{row.custom ? row.av : f$(row.v)}</td>
                      </tr>
                    );
                  })}
                </tbody></table>
              </Card>

              <div style={{ marginTop: 16, padding: 16, background: C.cardAlt, borderRadius: 4, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginBottom: 8 }}>💡 Save Another Scenario to Compare</div>
                <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.6, marginBottom: 12 }}>Go back to Inputs, change some parameters, and save as Scenario B to see a side-by-side comparison of how different choices impact your take-home pay and taxes.</div>
                <button onClick={() => setTab("input")} style={{
                  padding: "8px 24px", background: C.navy, color: "#fff", border: "none", borderRadius: 4,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: font, letterSpacing: "0.06em", textTransform: "uppercase",
                }}>Create Scenario B  --</button>
              </div>
            </>
          );
        }
        
        // Comparison view (both scenarios saved)
        const rows = [
          { h: "Income" },
          { l: "Gross Wages", a: a.ag, b: b.ag },
          (a.ap > 0 || b.ap > 0) && { l: "PFML Benefits", a: a.ap, b: b.ap },
          { l: "Adjusted Gross Income", a: a.agi, b: b.agi, bold: true },
          { h: "Tax Liability" },
          { l: "Federal Taxable Income", a: a.fti, b: b.fti },
          (a.otDed > 0 || b.otDed > 0) && { l: "OT Deduction (OBBBA)", a: a.otDed, b: b.otDed },
          (a.tipDed > 0 || b.tipDed > 0) && { l: "Tip Deduction (OBBBA)", a: a.tipDed, b: b.tipDed },
          (a.seniorDed > 0 || b.seniorDed > 0) && { l: "Senior Deduction", a: a.seniorDed, b: b.seniorDed },
          { l: "Net Federal Tax", a: a.nf, b: b.nf, bold: true, invert: true },
          { l: "FICA", a: Math.round(a.mf), b: Math.round(b.mf), invert: true },
          { l: "Maine Gross Tax", a: a.mg, b: b.mg, invert: true },
          { h: "Credits & Refund" },
          (a.eitc > 0 || b.eitc > 0) && { l: "Federal EITC", a: a.eitc, b: b.eitc },
          (a.meEitc > 0 || b.meEitc > 0) && { l: "Maine EITC", a: a.meEitc, b: b.meEitc },
          (a.ctc > 0 || b.ctc > 0) && { l: "Child Tax Credit", a: a.ctc, b: b.ctc },
          (a.actc > 0 || b.actc > 0) && { l: "ACTC (refundable)", a: a.actc, b: b.actc },
          (a.su > 0 || b.su > 0) && { l: "Saver's Credit", a: a.su, b: b.su },
          (a.cdctc > 0 || b.cdctc > 0) && { l: "Child Care Credit", a: a.cdctc, b: b.cdctc },
          { l: "Estimated Refund", a: a.tr, b: b.tr, bold: true },
          { h: "Cash Flow" },
          { l: "Weekly Work Take-Home", a: Math.round(a.wth), b: Math.round(b.wth) },
          { l: "Monthly Take-Home", a: Math.round(a.mt), b: Math.round(b.mt), bold: true },
          { l: "Monthly Surplus", a: Math.round(a.ms), b: Math.round(b.ms), bold: true },
          { h: "Savings" },
          { l: "Retirement Contributions", a: Math.round(a.tre), b: Math.round(b.tre) },
          { l: "Marginal Rate", a: null, b: null, custom: true, av: (a.mr*100).toFixed(1)+"%", bv: (b.mr*100).toFixed(1)+"%" },
        ].filter(Boolean);
        
        // Comparison view (both scenarios saved)
        return (<>
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: "14px 16px", background: C.bluePale, borderRadius: 4, borderLeft: `3px solid ${C.blue}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Scenario A</div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{scenLabel(ai)}</div>
            </div>
            <div style={{ padding: "14px 16px", background: C.amberPale, borderRadius: 4, borderLeft: `3px solid ${C.amber}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Scenario B</div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{scenLabel(bi)}</div>
            </div>
          </div>

          <div className="flex-kpi" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { l: "Refund", a: a.tr, b: b.tr },
              { l: "Monthly Take-Home", a: Math.round(a.mt), b: Math.round(b.mt) },
              { l: "Monthly Surplus", a: Math.round(a.ms), b: Math.round(b.ms) },
              { l: "Retirement / Yr", a: Math.round(a.tre), b: Math.round(b.tre) },
            ].map((k, idx) => (
              <div key={idx} style={{ flex: 1, minWidth: 130, padding: "14px 16px", background: C.white, borderRadius: 4, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Δ {k.l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: dColor(k.a, k.b) }}>{delta(k.a, k.b)}</div>
              </div>
            ))}
          </div>

          <Card noPad>
            <table style={{ width: "100%", borderCollapse: "collapse" }}><thead>
              <tr>
                <th style={{ ...tds, fontWeight: 700, color: C.navy, width: "40%" }}></th>
                <th style={{ ...thr, width: "20%", color: C.blue }}>A</th>
                <th style={{ ...thr, width: "20%", color: C.amber }}>B</th>
                <th style={{ ...thr, width: "20%" }}>Δ</th>
              </tr>
            </thead><tbody>
              {rows.map((row, j) => {
                if (row.h) return (
                  <tr key={j}><td colSpan={4} style={{ padding: "14px 20px 8px", fontWeight: 700, fontSize: 11, color: C.navy, borderBottom: `2px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.08em", background: C.cardAlt }}>{row.h}</td></tr>
                );
                if (row.custom) return (
                  <tr key={j}>
                    <td style={{ ...tds, color: C.textSec }}>{row.l}</td>
                    <td style={{ ...tdr }}>{row.av}</td>
                    <td style={{ ...tdr }}>{row.bv}</td>
                    <td style={{ ...tdr, color: C.textMuted }}>--</td>
                  </tr>
                );
                const hasTooltip = tooltips[row.l];
                return (
                  <tr key={j} style={{ background: row.bold ? C.cardAlt : "transparent" }}>
                    <td style={{ ...tds, fontWeight: row.bold ? 700 : 400, color: row.bold ? C.navy : C.textSec }}>
                      {hasTooltip ? (
                        <Tooltip text={tooltips[row.l]}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div>{row.l}</div>
                            <div style={{ fontSize: 11, color: C.blue, cursor: "pointer", fontWeight: 700 }}>?</div>
                          </div>
                        </Tooltip>
                      ) : row.l}
                    </td>
                    <td style={{ ...tdr, fontWeight: row.bold ? 700 : 500 }}>{f$(row.a)}</td>
                    <td style={{ ...tdr, fontWeight: row.bold ? 700 : 500 }}>{f$(row.b)}</td>
                    <td style={{ ...tdr, fontWeight: 600, color: dColor(row.a, row.b, row.invert) }}>{delta(row.a, row.b)}</td>
                  </tr>
                );
              })}
            </tbody></table>
          </Card>
        </>);
      })()}
    </div>
  )}

  {/* ==================== ADVISOR ==================== */}
  {tab === "advisor" && (
    <div>
      {!r ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 600, marginBottom: 8 }}>No scenario data</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Enter your compensation on the Inputs tab to generate optimization recommendations.</div>
          <button onClick={() => setTab("input")} style={{ padding: "10px 32px", background: C.navy, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font, letterSpacing: "0.06em", textTransform: "uppercase" }}>Go to Inputs  --</button>
        </div>
      ) : (() => {
        const recs = [];
        const fs = i.filingStatus;

        // OT deduction
        if (r.otDed > 0) {
          const taxSaved = Math.round(r.otDed * r.mr);
          recs.push({ priority: "info", title: `Overtime deduction: ${f$(r.otDed)} applied`, body: `The OBBBA overtime deduction is reducing your federal taxable income by ${f$(r.otDed)}, saving approximately ${f$(taxSaved)} in combined taxes. This deduction covers the 0.5x premium portion of your time-and-a-half pay. The cap is ${f$(fs === "MFJ" ? 25000 : 12500)}/yr through 2028.` });
        }
        if (i.payType === "hourly" && (i.otHours||0) === 0 && i.hourlyRate > 0) {
          recs.push({ priority: "low", title: "No overtime entered", body: `If you work any overtime, the OBBBA allows you to deduct the premium portion (the 0.5x part of time-and-a-half) from federal taxable income -- up to ${f$(fs === "MFJ" ? 25000 : 12500)}/yr. Even 2 hours/week of OT at $${i.hourlyRate}/hr would save approximately ${f$(Math.round(2 * i.hourlyRate * 0.5 * r.ww * r.mr))}/yr.` });
        }

        // Tip deduction
        if (r.tipDed > 0) {
          recs.push({ priority: "info", title: `Tip income deduction: ${f$(r.tipDed)} applied`, body: `Your tip income qualifies for the OBBBA deduction, reducing federal taxable income by ${f$(r.tipDed)} and saving approximately ${f$(Math.round(r.tipDed * r.mr))} in combined taxes. Cap: ${f$(fs === "MFJ" ? 50000 : 25000)}/yr through 2028.` });
        }

        // Senior deduction
        if (r.seniorDed > 0) {
          recs.push({ priority: "info", title: `Senior deduction: ${f$(r.seniorDed)} applied`, body: `The OBBBA senior deduction reduces your federal taxable income by ${f$(r.seniorDed)}, saving approximately ${f$(Math.round(r.seniorDed * r.mr))}. This is on top of the existing additional standard deduction for age 65+.` });
        }

        // Childcare credit
        if (r.cdctc > 0) {
          recs.push({ priority: "info", title: `Child & Dependent Care Credit: ${f$(r.cdctc)}`, body: `The OBBBA-enhanced CDCTC is reducing your federal tax by ${f$(r.cdctc)} based on ${f$(i.childcareExpenses)} in childcare expenses. This credit is nonrefundable -- it can only offset tax owed.` });
        }
        if ((i.numKidsUnder13||0) > 0 && (i.childcareExpenses||0) === 0) {
          const maxExp = (i.numKidsUnder13||0) >= 2 ? 6000 : 3000;
          recs.push({ priority: "medium", title: "Childcare expenses not entered", body: `You have ${i.numKidsUnder13} child${(i.numKidsUnder13||0)>1?"ren":""} under 13. If you pay for childcare while working, you may claim the OBBBA-enhanced Child & Dependent Care Credit on up to ${f$(maxExp)} in expenses. At your income level, the credit could be worth up to ${f$(calcCDCTC(r.agi, maxExp, fs))}.` });
        }

        // EITC
        if (r.eitc > 0) {
          recs.push({ priority: "info", title: `EITC: ${f$(r.eitc)} federal + ${f$(r.meEitc)} Maine`, body: `You qualify for ${f$(r.eitc)} in federal Earned Income Credit and ${f$(r.meEitc)} in Maine EITC (${i.numKidsUnder17 > 0 ? "25" : "50"}% of federal). Both are fully refundable. Note: increasing pre-tax deductions raises AGI-based phase-out risk for EITC -- balance retirement savings against credit eligibility.` });
        }
        if (r.eitc === 0 && r.ag > 0 && r.ag < 60000) {
          const testEitc = calcEitc(r.ag, r.agi, i.numKidsUnder17||0, fs);
          if (testEitc === 0 && (i.otherIncome||0) > EITC_INV_LIMIT) {
            recs.push({ priority: "medium", title: "EITC blocked by investment income", body: `Your other income of ${f$(i.otherIncome)} exceeds the ${f$(EITC_INV_LIMIT)} investment income limit for the Earned Income Credit. If any of that income is non-investment (side jobs, etc.), separating it could restore EITC eligibility.` });
          }
        }

        // No retirement
        if (r.t4 === 0 && r.r4 === 0) {
          recs.push({ priority: "high", title: "Start 401(k) contributions", body: `You have no retirement contributions. A 3% traditional 401(k) (${f$(Math.round(r.ag*.03))}/yr) would save approximately ${f$(Math.round(r.ag*.03*r.mr))} in annual taxes. Each pre-tax dollar saves ${Math.round(r.mr*100)}¢ at your marginal rate.` });
        }

        // Saver's Credit
        if (r.sr > 0 && r.aCTC > r.su) {
          const remaining = r.aCTC - r.su;
          const maxMore = Math.min(2000 - r.jq, remaining / r.sr);
          if (maxMore > 50) {
            recs.push({ priority: "high", title: `Maximize Saver's Credit at ${fp(r.sr)}`, body: `You have ${f$(remaining)} of unused capacity. Increasing retirement contributions by up to ${f$(Math.round(maxMore))} would generate an additional ${f$(Math.round(Math.min(maxMore, remaining / r.sr) * r.sr))} in credits.` });
          }
        }
        if (r.sr > 0 && r.sq === 0 && fs === "MFJ" && r.aCTC > r.su) {
          const spCr = Math.round(Math.min(2000, r.aCTC - r.su) * r.sr);
          if (spCr > 0) recs.push({ priority: "high", title: "Open a spouse Roth IRA", body: `A spouse Roth IRA contribution of up to $2,000 would generate ${f$(spCr)} in Saver's Credit at the ${fp(r.sr)} tier.` });
        }

        // HSA
        if (i.hsaEligible && r.hc < r.hl) {
          const gap = r.hl - r.hc;
          recs.push({ priority: "medium", title: "Maximize HSA contributions", body: `${f$(gap)} of unused HSA capacity. Contributing the full amount saves approximately ${f$(Math.round(gap * r.hr))} in combined taxes. HSA is triple-tax-advantaged.` });
        }

        // PFML
        if (i.pfmlWeeks === 0 && r.wg > 0) {
          const ben = pfmlB(r.wg);
          const pct = Math.round(ben / r.wg * 100);
          recs.push({ priority: "low", title: "PFML leave analysis", body: `If eligible, your weekly PFML benefit would be ${f$(Math.round(ben))} (${pct}% replacement). Benefits are FICA-exempt and Maine-exempt, so effective replacement is higher than the nominal rate.` });
        }

        // Student loans
        if (i.slPayments > 0 && i.slPayments < 2500) {
          recs.push({ priority: "low", title: "Maine Student Loan Credit", body: `You're claiming ${f$(i.slPayments)} of the $2,500 max. Increasing payments by ${f$(2500 - i.slPayments)} captures the full dollar-for-dollar Maine credit.` });
        }

        // Filing status
        if (fs === "S" && (i.numKidsUnder17||0) > 0) {
          recs.push({ priority: "medium", title: "Evaluate Head of Household", body: `If you provide over half the cost of maintaining a home for your dependent(s), HOH increases your standard deduction from ${f$(FED.S.std)} to ${f$(FED.HOH.std)} and widens tax brackets.` });
        }

        // Effective rate summary
        const totalTax = Math.max(0, r.nf - r.actc - r.eitc) + Math.round(r.mf) + Math.max(0, -r.mn);
        const effRate = r.ln9 > 0 ? (totalTax / r.ln9 * 100).toFixed(1) : "0.0";
        recs.push({ priority: "info", title: "Effective tax rate summary", body: `Combined effective rate: ${effRate}% on ${f$(r.ln9)} total income. Marginal rate: ${(r.mr*100).toFixed(1)}%.` });

        const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
        recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        const prColors = { high: { bg: C.greenPale, border: C.green, label: "High Impact" }, medium: { bg: C.bluePale, border: C.blue, label: "Medium Impact" }, low: { bg: C.amberPale, border: C.amber, label: "Consider" }, info: { bg: C.cardAlt, border: C.rule, label: "Summary" } };

        return (
          <Card title="Optimization Recommendations" sub={`${recs.length} recommendations generated from your current scenario. Sorted by estimated impact.`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recs.map((rec, idx) => {
                const pc = prColors[rec.priority];
                return (
                  <div key={idx} style={{ padding: "14px 16px", background: pc.bg, borderRadius: 4, borderLeft: `3px solid ${pc.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{rec.title}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: pc.border, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", background: C.white, borderRadius: 3, border: `1px solid ${pc.border}` }}>{pc.label}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.75 }}>{rec.body}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}
    </div>
  )}

  {!r && tab !== "input" && tab !== "about" && (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>No scenario data</div>
      <div style={{ fontSize: 13, color: C.textMuted }}>Enter your compensation on the Inputs tab to generate projections.</div>
    </div>
  )}

  <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 10, color: C.textMuted, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, marginTop: 24 }}>
    IRS Rev. Proc. 2025-32 · OBBBA  224-225, 70101-70412 · IRS Notice 2025-67 · Maine Revenue Services 2026
    <br />EITC: Rev. Proc. 2025-32 Table 5 · CDCTC: OBBBA 70301 · Senior Ded: OBBBA 70103 · Tip Ded: OBBBA 70201
    <br />PFML: federally taxable, FICA-exempt (2026), Maine-exempt per 26 M.R.S.  850-L
    <br />Maine dependent credit: 36 M.R.S. 5219-SS ($300/dep, 2026+)
    <br />Estimates only -- not tax advice. Consult a qualified professional.
    <br /><span style={{ fontSize: 9 }}>v2.0 · Last updated March 2026</span>
  </div>
</div>
);
}
