/**
 * Tax Calculation Engine - 2026 Tax Year
 * 
 * Based on:
 * - IRS Revenue Procedure 2025-32 (tax brackets, standard deductions)
 * - IRS Notice 2025-67 (CTC/ACTC)
 * - OBBBA §§ 70101-70412 (overtime, tips, senior, childcare)
 * - Maine Revenue Services 2026 Guidance
 * 
 * This module contains all tax calculation logic extracted for testability
 */

// ============================================================
// TAX TABLES & CONSTANTS
// ============================================================

export const FED = {
  MFJ: { std: 32200, bk: [[24800,.10],[100800,.12],[201800,.22],[383800,.24],[487450,.32],[768600,.35],[Infinity,.37]], cp: 400000 },
  S:   { std: 16100, bk: [[12400,.10],[50400,.12],[100900,.22],[191900,.24],[243700,.32],[609350,.35],[Infinity,.37]], cp: 200000 },
  HOH: { std: 24150, bk: [[17650,.10],[67500,.12],[100900,.22],[191900,.24],[243700,.32],[609350,.35],[Infinity,.37]], cp: 200000 },
};

export const ME = {
  MFJ: { std: 30600, exe: 5300, bk: [[52100,.058],[123250,.0675],[Infinity,.0715]] },
  S:   { std: 15300, exe: 5300, bk: [[26050,.058],[61600,.0675],[Infinity,.0715]] },
  HOH: { std: 22450, exe: 5300, bk: [[52100,.058],[61600,.0675],[Infinity,.0715]] },
};

export const CTC = 2200;
export const ACTC_MX = 1700;
export const SAV = { MFJ:[48500,52500,80500], S:[24250,26250,40250], HOH:[36375,39375,60375] };
export const HSA_L = { self: 4400, family: 8750 };
export const SAWW = 1198.84;

// EITC 2026 -- Rev Proc 2025-32
// [phaseInRate, maxCredit, earnedIncForMax, phaseOutStart_S, phaseOutStart_MFJ, phaseOutRate]
export const EITC_T = [
  [0.0765,   664,  8680, 10860, 18140, 0.0765],  // 0 kids
  [0.34,    4427, 13020, 23890, 31160, 0.1598],   // 1 kid
  [0.40,    7316, 18290, 23890, 31160, 0.2106],   // 2 kids
  [0.45,    8231, 18290, 23890, 31160, 0.2106],   // 3+ kids
];
export const EITC_INV_LIMIT = 12200;

// OBBBA Senior Deduction (2025-2028)
export const SENIOR_DED = 6000;
export const SENIOR_PO = { S: 75000, MFJ: 150000, HOH: 75000 };

// ============================================================
// TAX CALCULATION FUNCTIONS
// ============================================================

/**
 * Progressive tax calculation
 * @param {number} inc - Taxable income
 * @param {Array} bk - Bracket array [[top, rate], ...]
 * @returns {number} Total tax liability (rounded)
 */
export function ptax(inc, bk) {
  let t = 0, p = 0;
  for (const [top, r] of bk) {
    if (inc <= p) break;
    t += (Math.min(inc, top) - p) * r;
    p = top;
  }
  return Math.round(t);
}

/**
 * Saver's credit rate based on AGI and filing status
 * @param {number} agi - Adjusted gross income
 * @param {string} s - Filing status (S, MFJ, HOH)
 * @returns {number} Saver's credit rate (50%, 20%, 10%, or 0%)
 */
export function sRate(agi, s) {
  const t = SAV[s];
  if (agi <= t[0]) return .5;
  if (agi <= t[1]) return .2;
  if (agi <= t[2]) return .1;
  return 0;
}

/**
 * Maine PFML benefit calculation (weekly)
 * @param {number} wg - Weekly gross wage
 * @returns {number} PFML weekly benefit amount
 */
export function pfmlB(wg) {
  return Math.min(SAWW, .9 * SAWW * .5 + .66 * Math.max(0, wg - SAWW * .5));
}

/**
 * Maine Sales Tax Fairness Credit calculation
 * @param {number} ln9 - Line 9 income
 * @param {number} kids - Number of qualifying children
 * @param {string} fs - Filing status
 * @returns {number} STFC credit amount
 */
export function stfcCalc(ln9, kids, fs) {
  if (fs === "S") {
    if (ln9 <= 24750) return 150;
    const s = Math.floor((ln9 - 24750) / 500);
    return Math.max(0, 150 - (s + 1) * 10);
  }
  const col = kids >= 2 ? 2 : kids >= 1 ? 1 : 0;
  const base = fs === "HOH" ? 37100 : 49500;
  const step = fs === "HOH" ? 750 : 1000;
  const mx = [210, 240, 270][col];
  const dec = fs === "HOH" ? 15 : 20;
  if (ln9 <= base) return mx;
  const s = Math.floor((ln9 - base) / step);
  return Math.max(0, mx - (s + 1) * dec);
}

/**
 * Federal EITC calculation (IRS Rev. Proc. 2025-32)
 * @param {number} earnedInc - Earned income (wages)
 * @param {number} agi - Adjusted gross income
 * @param {number} kids - Number of qualifying children
 * @param {string} fs - Filing status
 * @returns {number} EITC credit amount
 */
export function calcEitc(earnedInc, agi, kids, fs) {
  const row = EITC_T[Math.min(kids, 3)];
  const [piRate, maxCr, , poS, poMFJ, poRate] = row;
  const poStart = fs === "MFJ" ? poMFJ : poS;
  const credit = Math.min(Math.round(earnedInc * piRate), maxCr);
  const poIncome = Math.max(earnedInc, agi);
  if (poIncome <= poStart) return credit;
  return Math.max(0, credit - Math.round((poIncome - poStart) * poRate));
}

/**
 * OBBBA Child & Dependent Care Credit (2026+, nonrefundable)
 * Based on IRS Publication 503 with OBBBA modifications
 * @param {number} agi - Adjusted gross income
 * @param {number} expenses - Child/dependent care expenses
 * @param {string} fs - Filing status
 * @returns {number} CDCTC credit amount
 */
export function calcCDCTC(agi, expenses, fs) {
  if (expenses <= 0) return 0;
  let pct;
  if (fs === "MFJ") {
    if (agi <= 15000) pct = 50;
    else if (agi <= 43000) pct = 50 - Math.ceil((agi - 15000) / 2000);
    else if (agi <= 150000) pct = 35;
    else if (agi <= 210000) pct = 35 - Math.ceil((agi - 150000) / 2000) * (15 / 30);
    else pct = 20;
  } else {
    if (agi <= 15000) pct = 50;
    else if (agi <= 43000) pct = 50 - Math.ceil((agi - 15000) / 2000);
    else if (agi <= 75000) pct = 35;
    else if (agi <= 105000) pct = 35 - Math.ceil((agi - 75000) / 2000) * (15 / 30);
    else pct = 20;
  }
  pct = Math.max(20, Math.min(50, pct));
  return Math.round(expenses * pct / 100);
}

// ============================================================
// FORMATTING UTILITIES
// ============================================================

export const f$ = n => {
  const a = Math.abs(Math.round(n));
  return (n < 0 ? "-" : "") + "$" + a.toLocaleString();
};

export const fp = n => Math.round(n * 100) + "%";

// ============================================================
// MASTER CALCULATION ENGINE
// ============================================================

/**
 * Complete tax calculation for all federal, state, and local taxes
 * @param {Object} i - Input object with all tax parameters
 * @returns {Object} Result object with all calculated tax values
 */
export function calc(i) {
  const fs = i.filingStatus;
  const fed = FED[fs];
  const me = ME[fs];
  
  // Income calculations
  const wg = i.payType === "hourly" 
    ? i.hourlyRate * i.hoursPerWeek + (i.otHours || 0) * i.hourlyRate * 1.5 
    : i.salary / 52;
  const ww = 52 - (i.pfmlWeeks || 0);
  const ag = wg * ww;
  const ap = i.pfmlWeeks > 0 ? pfmlB(wg) * i.pfmlWeeks : 0;
  const hp = (i.healthPremium || 0) * 52;
  const t4 = ag * (i.trad401kPct || 0) / 100;
  const r4 = ag * (i.roth401kPct || 0) / 100;
  const hl = i.hsaEligible ? HSA_L[i.hsaTier || "self"] : 0;
  const hc = Math.min(i.hsaContrib || 0, hl);
  const w2 = ag - hp - t4 - hc;
  const si = i.spouseIncome || 0;
  const spt = si * (i.spouseTrad401kPct || 0) / 100;
  const ln9 = w2 + ap + (i.otherIncome || 0) + (si - spt);
  const sli = Math.min(i.slInterest || 0, 2500);
  const agi = ln9 - sli;

  // OBBBA Deductions
  const otPremium = i.payType === "hourly" 
    ? (i.otHours || 0) * i.hourlyRate * 0.5 * ww 
    : 0;
  const otDedCap = fs === "MFJ" ? 25000 : 12500;
  const otMagiTh = fs === "MFJ" ? 300000 : 150000;
  const otDed = agi > otMagiTh ? 0 : Math.min(Math.round(otPremium), otDedCap);

  const tipDedCap = fs === "MFJ" ? 50000 : 25000;
  const tipMagiTh = fs === "MFJ" ? 300000 : 150000;
  const tipDed = agi > tipMagiTh ? 0 : Math.min(i.annualTips || 0, tipDedCap);

  const seniorTh = SENIOR_PO[fs] || 75000;
  const seniorCount = i.age65 ? (fs === "MFJ" ? (i.spouseAge65 ? 2 : 1) : 1) : 0;
  let seniorDed = seniorCount * SENIOR_DED;
  if (agi > seniorTh && seniorDed > 0) {
    seniorDed = Math.max(0, seniorDed - Math.round((agi - seniorTh) * 0.06));
  }

  // Federal taxation
  const fti = Math.max(0, agi - fed.std - otDed - tipDed - seniorDed);
  const fg = ptax(fti, fed.bk);
  const nk = i.numKidsUnder17 || 0;
  const ctc = nk * CTC;
  const aCTC = Math.max(0, fg - ctc);
  const actc = Math.min(ACTC_MX * nk, Math.max(0, ctc - fg));
  const jq = Math.min(t4 + r4, 2000);
  const sq = Math.min(i.spouseRetire || 0, 2000);
  const sr = sRate(agi, fs);
  const sm = Math.round((jq + sq) * sr);
  const su = Math.min(sm, aCTC);
  const nf = Math.max(0, aCTC - su);

  // EITC
  const eitcEI = ag + (si > 0 ? si : 0);
  const invInc = i.otherIncome || 0;
  const eitc = invInc > EITC_INV_LIMIT ? 0 : calcEitc(eitcEI, agi, nk, fs);
  const meEitc = Math.round(eitc * (nk > 0 ? 0.25 : 0.50));

  // CDCTC
  const ccExpCap = (i.numKidsUnder13 || 0) >= 2 ? 6000 : (i.numKidsUnder13 || 0) >= 1 ? 3000 : 0;
  const ccExp = Math.min(i.childcareExpenses || 0, ccExpCap);
  const cdctcGross = calcCDCTC(agi, ccExp, fs);
  const cdctc = Math.min(cdctcGross, nf);

  // Maine taxation
  const fb = ag - hp - hc;
  const mf = fb * .0765;
  const sf = si * .0765;
  const mi = ln9 - ap;
  const ma = mi - sli;
  const ne = fs === "MFJ" ? 2 : 1;
  const mti = Math.max(0, ma - me.std - me.exe * ne);
  const mg = ptax(mti, me.bk);
  const rent = i.housingType === "rent" ? (i.monthlyHousing || 0) * 12 : 0;
  const pt = i.housingType === "own" ? (i.annualPropTax || 0) : 0;
  const ht = i.housingType === "rent" && i.rentIncHeat ? rent * .15 : 0;
  const pb = i.housingType === "rent" ? (rent - ht) * .15 : pt;
  const pc = Math.min(i.age65 ? 2000 : 1000, Math.round(Math.max(0, pb - ln9 * .04)));
  const sc = stfcCalc(ln9, nk, fs);
  const sl = Math.min(i.slPayments || 0, 2500);
  const nDeps = i.numKidsUnder17 || 0;
  const dc = nDeps * 300; // 36 M.R.S. §5219-SS

  // Maine net
  const mn = sl + dc + pc + sc + meEitc - mg;

  // Federal balance
  const fedAfterCDCTC = Math.max(0, nf - cdctc);
  const fedBal = fedAfterCDCTC - actc - eitc;
  const tr = Math.max(0, -fedBal) + Math.max(0, mn);
  const to = Math.max(0, fedBal) + Math.max(0, -mn);

  return {
    wg, ww, ag, ap, hp, t4, r4, hc, hl, w2, ln9, agi, fti, fg, ctc, aCTC, actc,
    jq, sq, sr, sm, su, nf, mf, sf, mi, ma, mti, mg, pc, sc, sl, dc, mn, tr, to,
    wf: nf / 52, wth: 0, pth: 0, ja: 0, sn: 0, an: 0, mt: 0, ms: 0, tre: 0, mr: 0, hr: 0, spt,
    otDed, tipDed, seniorDed, eitc, meEitc, otPremium, cdctc,
    pfmlBen: i.pfmlWeeks > 0 ? pfmlB(wg) : 0,
  };
}
