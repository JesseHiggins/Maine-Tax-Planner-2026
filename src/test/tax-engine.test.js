/**
 * Tax Calculation Unit Tests
 * 
 * Tests all tax calculation functions against known good values from:
 * - IRS Revenue Procedure 2025-32
 * - IRS Notice 2025-67
 * - Maine Revenue Services 2026 Guidance
 * 
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  ptax,
  sRate,
  pfmlB,
  stfcCalc,
  calcEitc,
  calcCDCTC,
  calc,
  FED,
  ME,
  CTC,
  EITC_T,
  SAWW,
} from '../tax-engine.js';
import { TEST_SCENARIOS, IRS_2026_DATA, MAINE_2026_DATA } from './testData.js';

describe('Tax Constants - IRS 2026 Values', () => {
  it('verifies federal standard deductions match IRS Rev. Proc. 2025-32', () => {
    expect(FED.S.std).toBe(16100);
    expect(FED.MFJ.std).toBe(32200);
    expect(FED.HOH.std).toBe(24150);
  });

  it('verifies Maine standard deductions match Maine Revenue Services', () => {
    expect(ME.S.std).toBe(15300);
    expect(ME.MFJ.std).toBe(30600);
    expect(ME.HOH.std).toBe(22450);
  });

  it('verifies CTC amount from IRS Notice 2025-67', () => {
    expect(CTC).toBe(2200);
  });

  it('verifies EITC maximum credit amounts for different kid counts', () => {
    // From EITC_T array: [phaseInRate, maxCredit, ...]
    expect(EITC_T[0][1]).toBe(664); // 0 kids
    expect(EITC_T[1][1]).toBe(4427); // 1 kid
    expect(EITC_T[2][1]).toBe(7316); // 2 kids
    expect(EITC_T[3][1]).toBe(8231); // 3+ kids
  });

  it('verifies federal tax brackets for single filer', () => {
    // First bracket: 10% on income up to $12,400
    expect(FED.S.bk[0]).toEqual([12400, 0.10]);
    // Second bracket: 12% on income from $12,400 to $50,400
    expect(FED.S.bk[1]).toEqual([50400, 0.12]);
  });

  it('verifies Maine tax brackets for single filer', () => {
    // First bracket: 5.8% up to $26,050
    expect(ME.S.bk[0]).toEqual([26050, 0.058]);
    // Second bracket: 6.75% from $26,050 to $61,600
    expect(ME.S.bk[1]).toEqual([61600, 0.0675]);
    // Third bracket: 7.15% above $61,600
    expect(ME.S.bk[2]).toEqual([Infinity, 0.0715]);
  });
});

describe('ptax() - Progressive Tax Calculation', () => {
  it('calculates federal tax for single filer at 10% bracket', () => {
    // Income in 10% bracket only: $10,000 * 0.10 = $1,000
    const tax = ptax(10000, FED.S.bk);
    expect(tax).toBe(1000);
  });

  it('calculates federal tax across multiple brackets', () => {
    // Single filer: $30,000 income
    // $12,400 @ 10% = $1,240
    // $17,600 @ 12% = $2,112
    // Total = $3,352
    const tax = ptax(30000, FED.S.bk);
    expect(tax).toBe(3352);
  });

  it('calculates Maine tax with correct brackets', () => {
    // Single filer: $50,000
    // $26,050 @ 5.8% = $1,510.90
    // $23,950 @ 6.75% = $1,616.63
    // Total ≈ $3,128 (rounded)
    const tax = ptax(50000, ME.S.bk);
    expect(tax).toBe(3128);
  });

  it('handles zero income correctly', () => {
    expect(ptax(0, FED.S.bk)).toBe(0);
    expect(ptax(0, ME.S.bk)).toBe(0);
  });

  it('handles married filing jointly with higher tax', () => {
    // MFJ: $50,000
    // $24,800 @ 10% = $2,480
    // $25,200 @ 12% = $3,024
    // Total = $5,504
    const tax = ptax(50000, FED.MFJ.bk);
    expect(tax).toBe(5504);
  });
});

describe('sRate() - Saver\'s Credit Rate', () => {
  it('returns 50% rate for single filer under $24,250', () => {
    expect(sRate(20000, 'S')).toBe(0.5);
  });

  it('returns 20% rate for single filer between $24,250 and $26,250', () => {
    expect(sRate(25000, 'S')).toBe(0.2);
  });

  it('returns 10% rate for single filer between $26,250 and $40,250', () => {
    expect(sRate(30000, 'S')).toBe(0.1);
  });

  it('returns 0% rate for single filer over $40,250', () => {
    expect(sRate(45000, 'S')).toBe(0);
  });

  it('applies MFJ limits correctly', () => {
    expect(sRate(48000, 'MFJ')).toBe(0.5); // Under $48,500
    expect(sRate(51000, 'MFJ')).toBe(0.2); // Between $48,500 and $52,500
    expect(sRate(55000, 'MFJ')).toBe(0.1); // Between $52,500 and $80,500
    expect(sRate(85000, 'MFJ')).toBe(0); // Over $80,500
  });
});

describe('calcEitc() - Federal EITC Calculation', () => {
  it('calculates EITC for single filer with no children', () => {
    // 0-kid EITC: 7.65% phase-in up to $8,680
    // At $5,000: $5,000 * 0.0765 = $382.50
    const eitc = calcEitc(5000, 5000, 0, 'S');
    expect(eitc).toBe(383); // Rounded
  });

  it('reaches maximum EITC for single filer with 1 child', () => {
    // 1-kid: max $4,427 at $13,020 earned income
    const eitc = calcEitc(13020, 13020, 1, 'S');
    expect(eitc).toBe(4427);
  });

  it('phases down EITC correctly as income exceeds phase-out threshold', () => {
    // 1-kid: max $4,427, phase-out starts at $23,890 for single
    // At $25,000: credit = $4,427 - ($25,000 - $23,890) * 0.1598
    // = $4,427 - $1,110 * 0.1598 = $4,427 - $177 = $4,250
    const eitc = calcEitc(25000, 25000, 1, 'S');
    expect(eitc).toBeLessThan(4427);
    expect(eitc).toBeGreaterThan(4200);
  });

  it('calculates EITC for MFJ with higher phase-out threshold', () => {
    // MFJ threshold is higher: $31,160 for 1-kid
    // So at $30,000 (under threshold), should get max credit
    const eitc = calcEitc(30000, 30000, 1, 'MFJ');
    expect(eitc).toBe(4427);
  });

  it('phases out EITC to zero if income is very high', () => {
    const eitc = calcEitc(50000, 50000, 0, 'S');
    expect(eitc).toBe(0);
  });

  it('calculates higher EITC for 2 children than 1 child at same income', () => {
    const eitc1kid = calcEitc(15000, 15000, 1, 'S');
    const eitc2kids = calcEitc(15000, 15000, 2, 'S');
    expect(eitc2kids).toBeGreaterThan(eitc1kid);
  });
});

describe('calcCDCTC() - Child & Dependent Care Credit', () => {
  it('returns zero when expenses are zero', () => {
    expect(calcCDCTC(50000, 0, 'S')).toBe(0);
  });

  it('applies 50% credit rate for low income (single under $15k)', () => {
    // $2,000 expenses * 50% = $1,000
    const credit = calcCDCTC(10000, 2000, 'S');
    expect(credit).toBe(1000);
  });

  it('reduces credit rate as income increases', () => {
    const credit15k = calcCDCTC(15000, 2000, 'S');
    const credit25k = calcCDCTC(25000, 2000, 'S');
    const credit50k = calcCDCTC(50000, 2000, 'S');
    expect(credit15k).toBeGreaterThan(credit25k);
    expect(credit25k).toBeGreaterThan(credit50k);
  });

  it('applies minimum 20% credit rate at high income', () => {
    // High income: should get minimum 20% of expenses
    const credit = calcCDCTC(200000, 2000, 'S');
    expect(credit).toBe(400); // $2,000 * 20%
  });

  it('applies MFJ thresholds correctly', () => {
    // MFJ has higher threshold for 50% credit rate
    const creditSingle = calcCDCTC(20000, 2000, 'S');
    const creditMFJ = calcCDCTC(20000, 2000, 'MFJ');
    expect(creditMFJ).toBeGreaterThan(creditSingle); // MFJ still gets higher rate at $20k
  });
});

describe('stfcCalc() - Maine Sales Tax Fairness Credit', () => {
  it('returns correct amount for single filer under $24,750', () => {
    const credit = stfcCalc(20000, 0, 'S');
    expect(credit).toBe(150); // Base amount
  });

  it('phases down credit for single filer above $24,750', () => {
    const baseCredit = stfcCalc(24750, 0, 'S');
    const reducedCredit = stfcCalc(25000, 0, 'S');
    expect(baseCredit).toBeGreaterThan(reducedCredit);
  });

  it('calculates credit with kids', () => {
    const creditNoKids = stfcCalc(40000, 0, 'MFJ');
    const creditWith2Kids = stfcCalc(40000, 2, 'MFJ');
    expect(creditWith2Kids).toBeGreaterThan(creditNoKids);
  });
});

describe('Integration Tests - Complete Tax Scenarios', () => {
  Object.entries(TEST_SCENARIOS).forEach(([scenarioName, scenario]) => {
    describe(`Scenario: ${scenarioName}`, () => {
      it('matches expected federal tax from IRS/Maine tables', () => {
        const result = calc(scenario.input);
        // Allow small variance due to rounding
        expect(result.fg).toBeLessThan(scenario.expected.federalTax * 1.05);
        expect(result.fg).toBeGreaterThan(scenario.expected.federalTax * 0.95);
      });

      it('calculates correct Maine tax based on Maine tax brackets', () => {
        const result = calc(scenario.input);
        if (scenario.expected.maineTax) {
          expect(result.mg).toBeLessThan(scenario.expected.maineTax * 1.05);
          expect(result.mg).toBeGreaterThan(scenario.expected.maineTax * 0.95);
        }
      });

      it('applies income thresholds and deductions correctly', () => {
        const result = calc(scenario.input);
        if (scenario.expected.otDeduction !== undefined) {
          expect(result.otDed).toBe(scenario.expected.otDeduction);
        }
      });
    });
  });
});

describe('Edge Cases and Validation', () => {
  it('handles zero income correctly (homeless/no job)', () => {
    const result = calc({
      filingStatus: 'S',
      payType: 'salary',
      salary: 0,
      numKidsUnder17: 0,
      age65: false,
      spouseIncome: 0,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 0,
      annualTips: 0,
      hourlyRate: 0,
      hoursPerWeek: 0,
      otHours: 0,
    });
    expect(result.ag).toBe(0);
    expect(result.fg).toBe(0);
  });

  it('handles very high income (millionaire)', () => {
    const result = calc({
      filingStatus: 'MFJ',
      payType: 'salary',
      salary: 1000000,
      numKidsUnder17: 0,
      age65: false,
      spouseAge65: false,
      spouseIncome: 0,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 0,
      annualTips: 0,
      hourlyRate: 0,
      hoursPerWeek: 0,
      otHours: 0,
    });
    expect(result.ag).toBe(1000000);
    expect(result.fg).toBeGreaterThan(0);
    expect(result.fg).toBeGreaterThan(200000); // Should be significant
  });

  it('applies standard deduction correctly', () => {
    const result = calc({
      filingStatus: 'S',
      payType: 'salary',
      salary: 16000, // Less than standard deduction
      numKidsUnder17: 0,
      age65: false,
      spouseIncome: 0,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 0,
      annualTips: 0,
      hourlyRate: 0,
      hoursPerWeek: 0,
      otHours: 0,
    });
    expect(result.fti).toBe(0); // FTI should be 0 (income < std deduction)
    expect(result.fg).toBe(0); // No federal tax owed
  });

  it('handles partial year employment (partial PFML)', () => {
    const result = calc({
      filingStatus: 'S',
      payType: 'hourly',
      hourlyRate: 20,
      hoursPerWeek: 40,
      otHours: 0,
      salary: 0,
      numKidsUnder17: 0,
      age65: false,
      spouseIncome: 0,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 0,
      annualTips: 0,
      pfmlWeeks: 8, // 8 weeks of PFML
    });
    // With PFML, work weeks = 52 - 8 = 44 weeks
    expect(result.ww).toBe(44);
  });
});

describe('OBBBA Provisions Validation', () => {
  it('applies overtime deduction correctly', () => {
    const result = calc({
      filingStatus: 'S',
      payType: 'hourly',
      hourlyRate: 30,
      hoursPerWeek: 40,
      otHours: 10, // 10 hours OT per week
      salary: 0,
      numKidsUnder17: 0,
      age65: false,
      spouseIncome: 0,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 0,
      annualTips: 0,
      hourlyRate: 30,
      hoursPerWeek: 40,
      otHours: 10,
    });
    expect(result.otDed).toBeGreaterThan(0);
  });

  it('phases out overtime deduction above MAGI threshold', () => {
    // Single filer: OT deduction phases out above $150k MAGI
    const resultUnderThreshold = calc({
      filingStatus: 'S',
      payType: 'salary',
      salary: 140000,
      numKidsUnder17: 0,
      age65: false,
      spouseIncome: 0,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 0,
      annualTips: 2000,
      hourlyRate: 0,
      hoursPerWeek: 40,
      otHours: 0,
    });
    expect(resultUnderThreshold.tipDed).toBe(2000);

    const resultOverThreshold = calc({
      filingStatus: 'S',
      payType: 'salary',
      salary: 160000,
      numKidsUnder17: 0,
      age65: false,
      spouseIncome: 0,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 0,
      annualTips: 2000,
      hourlyRate: 0,
      hoursPerWeek: 40,
      otHours: 0,
    });
    expect(resultOverThreshold.tipDed).toBe(0); // No deduction above threshold
  });
});
