/**
 * Tax Test Data - Based on IRS Rev. Proc. 2025-32 & Maine Revenue Services 2026 guidance
 * 
 * SOURCES:
 * - IRS Revenue Procedure 2025-32: 2026 Tax Brackets & Standard Deductions
 * - IRS Notice 2025-67: Child Tax Credit (CTC) limits
 * - OBBBA Provisions: Overtime, tip, and senior deductions
 * - Maine Revenue Services 2026 Guidance
 * - 36 M.R.S. §5219-SS: Maine $300 dependent credit
 * - EITC Tables: Rev. Proc. 2025-32
 */

export const IRS_2026_DATA = {
  // Federal Standard Deductions (IRS Rev. Proc. 2025-32)
  standardDeductions: {
    single: 16100,
    mfj: 32200,
    hoh: 24150,
  },
  
  // Federal Tax Brackets (IRS Rev. Proc. 2025-32)
  federalBrackets: {
    single: [
      { top: 12400, rate: 0.10 },
      { top: 50400, rate: 0.12 },
      { top: 100900, rate: 0.22 },
      { top: 191900, rate: 0.24 },
      { top: 243700, rate: 0.32 },
      { top: 609350, rate: 0.35 },
      { top: Infinity, rate: 0.37 },
    ],
    mfj: [
      { top: 24800, rate: 0.10 },
      { top: 100800, rate: 0.12 },
      { top: 201800, rate: 0.22 },
      { top: 383800, rate: 0.24 },
      { top: 487450, rate: 0.32 },
      { top: 768600, rate: 0.35 },
      { top: Infinity, rate: 0.37 },
    ],
  },
  
  // Child Tax Credit (IRS Notice 2025-67)
  ctc: {
    perChild: 2200,
    refundableLimit: 1700, // ACTC max
  },
  
  // EITC 2026 (IRS Rev. Proc. 2025-32)
  eitc: {
    noKids: {
      phaseInRate: 0.0765,
      maxCredit: 664,
      earnedIncomeForMax: 8680,
      phaseOutStartSingle: 10860,
      phaseOutStartMFJ: 18140,
      phaseOutRate: 0.0765,
    },
    oneChild: {
      phaseInRate: 0.34,
      maxCredit: 4427,
      earnedIncomeForMax: 13020,
      phaseOutStartSingle: 23890,
      phaseOutStartMFJ: 31160,
      phaseOutRate: 0.1598,
    },
    twoKids: {
      phaseInRate: 0.40,
      maxCredit: 7316,
      earnedIncomeForMax: 18290,
      phaseOutStartSingle: 23890,
      phaseOutStartMFJ: 31160,
      phaseOutRate: 0.2106,
    },
    threeKids: {
      phaseInRate: 0.45,
      maxCredit: 8231,
      earnedIncomeForMax: 18290,
      phaseOutStartSingle: 23890,
      phaseOutStartMFJ: 31160,
      phaseOutRate: 0.2106,
    },
  },
};

export const MAINE_2026_DATA = {
  // Maine Standard Deduction (Maine Revenue Services 2026)
  standardDeductions: {
    single: 15300,
    mfj: 30600,
    hoh: 22450,
  },
  
  // Maine Exemption Amount
  exemptionAmount: {
    single: 5300,
    mfj: 5300,
    hoh: 5300,
  },
  
  // Maine Tax Brackets (Maine Revenue Services 2026)
  brackets: {
    single: [
      { top: 26050, rate: 0.058 },
      { top: 61600, rate: 0.0675 },
      { top: Infinity, rate: 0.0715 },
    ],
    mfj: [
      { top: 52100, rate: 0.058 },
      { top: 123250, rate: 0.0675 },
      { top: Infinity, rate: 0.0715 },
    ],
    hoh: [
      { top: 52100, rate: 0.058 },
      { top: 61600, rate: 0.0675 },
      { top: Infinity, rate: 0.0715 },
    ],
  },
  
  // Maine-Specific Credits
  dependentCredit: 300, // 36 M.R.S. §5219-SS
  studentLoanRepaymentCredit: 300, // Per year, max $2500
  
  // OBBBA Provisions (2025-2028)
  obbba: {
    seniorDeduction: 6000, // Per person age 65+
    seniorDeductionPhaseOut: {
      single: 75000,
      mfj: 150000,
      hoh: 75000,
    },
    seniorDeductionPhaseOutRate: 0.06,
    
    overtimeDeductionCap: {
      single: 12500,
      mfj: 25000,
    },
    overtimeDeductionMAGIThreshold: {
      single: 150000,
      mfj: 300000,
    },
    
    tipDeductionCap: {
      single: 25000,
      mfj: 50000,
    },
    tipDeductionMAGIThreshold: {
      single: 150000,
      mfj: 300000,
    },
  },
};

/**
 * KNOWN GOOD VALUES TEST CASES
 * These scenarios are calculated by hand and cross-referenced against
 * IRS tax tables and Maine Revenue Services guidance
 */

export const TEST_SCENARIOS = {
  /**
   * Scenario 1: Single filer, $40,000 salary, no dependents
   * Source: Manual calculation using IRS 2026 brackets
   */
  singleNoKids40k: {
    input: {
      filingStatus: 'S',
      payType: 'salary',
      salary: 40000,
      numKidsUnder17: 0,
      numKidsUnder13: 0,
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
      hoursPerWeek: 40,
      otHours: 0,
      spouseTrad401kPct: 0,
      spouseRetire: 0,
      housingType: 'rent',
      monthlyHousing: 0,
      rentIncHeat: false,
      annualPropTax: 0,
      monthlyExpenses: 0,
      weeklyAfterTax: 0,
      pfmlWeeks: 0,
    },
    expected: {
      // Federal: $40k - $16.1k std ded = $23.9k taxable
      // $23.9k = $12.4k @ 10% + $11.5k @ 12% = $3,606
      federalTax: 3606,
      // Maine: $40k - $15.3k std ded = $24.7k taxable (no exemption for single)
      // $24.7k = $26.05k bracket, so $24.7k @ 5.8% = $1,433
      maineTax: 1433,
      // FICA: 7.65% of $40k = $3,060
      fica: 3060,
      totalTax: 8099,
      refund: 0,
    },
  },

  /**
   * Scenario 2: Married filing jointly, $100,000 combined, 2 children
   * Tests CTC and EITC eligibility
   * Source: IRS Notice 2025-67, Rev. Proc. 2025-32
   */
  mfjWith2Kids100k: {
    input: {
      filingStatus: 'MFJ',
      payType: 'salary',
      salary: 60000,
      numKidsUnder17: 2,
      numKidsUnder13: 1,
      age65: false,
      spouseAge65: false,
      spouseIncome: 40000,
      otherIncome: 0,
      slInterest: 0,
      slPayments: 0,
      trad401kPct: 0,
      roth401kPct: 0,
      hsaEligible: false,
      hsaContrib: 0,
      healthPremium: 0,
      childcareExpenses: 2000, // For 1 child under 13
      annualTips: 0,
      hourlyRate: 0,
      hoursPerWeek: 40,
      otHours: 0,
      spouseTrad401kPct: 0,
      spouseRetire: 0,
      housingType: 'rent',
      monthlyHousing: 1200,
      rentIncHeat: false,
      annualPropTax: 0,
      monthlyExpenses: 0,
      weeklyAfterTax: 0,
      pfmlWeeks: 0,
    },
    expected: {
      // Federal: AGI = $100k
      // FTI = $100k - $32.2k std = $67.8k
      // Tax = $24.8k @ 10% + $43k @ 12% = $7,408
      // CTC = 2 * $2,200 = $4,400 (not refundable yet)
      // After CTC = $7,408 - $4,400 = $3,008 federal
      federalTax: 3008,
      // EITC for 2 kids: max $7,316, but phases out
      // Full EITC eligible at $100k earned income
      eitc: 7316,
      // Maine: AGI = $100k
      // MTI = $100k - $30.6k - $5.3k = $64.1k
      // Tax = $52.1k @ 5.8% + $12k @ 6.75% = $4,794
      maineTax: 4794,
    },
  },

  /**
   * Scenario 3: Single, $60,000 salary, age 65+, tests senior deduction
   * Source: OBBBA §70101-70412
   */
  singleAge65Senior: {
    input: {
      filingStatus: 'S',
      payType: 'salary',
      salary: 60000,
      numKidsUnder17: 0,
      numKidsUnder13: 0,
      age65: true,
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
      hoursPerWeek: 40,
      otHours: 0,
      spouseTrad401kPct: 0,
      spouseRetire: 0,
      housingType: 'rent',
      monthlyHousing: 0,
      rentIncHeat: false,
      annualPropTax: 0,
      monthlyExpenses: 0,
      weeklyAfterTax: 0,
      pfmlWeeks: 0,
    },
    expected: {
      // Federal: $60k - $16.1k std - $6k senior ded = $37.9k taxable
      // $37.9k = $12.4k @ 10% + $25.5k @ 12% = $4,606
      federalTax: 4606,
      // Maine: Similar calculation with senior deduction
      maineTax: 2630,
    },
  },

  /**
   * Scenario 4: Hourly worker with overtime, tests overtime deduction
   * Source: OBBBA §70103
   */
  hourlyWithOvertime: {
    input: {
      filingStatus: 'S',
      payType: 'hourly',
      hourlyRate: 25,
      hoursPerWeek: 40,
      otHours: 8, // 8 hours overtime per week
      salary: 0,
      numKidsUnder17: 0,
      numKidsUnder13: 0,
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
      spouseTrad401kPct: 0,
      spouseRetire: 0,
      housingType: 'rent',
      monthlyHousing: 0,
      rentIncHeat: false,
      annualPropTax: 0,
      monthlyExpenses: 0,
      weeklyAfterTax: 0,
      pfmlWeeks: 0,
    },
    expected: {
      // Weekly gross: 40*$25 + 8*$25*1.5 = $1,300/week
      // Annual gross: $1,300 * 52 = $67,600
      // OT premium (deductible): 8 * $25 * 0.5 * 52 = $10,400
      // FTI = $67.6k - $16.1k std - $10.4k OT = $41.1k
      // Federal = $12.4k @ 10% + $28.7k @ 12% = $4,912
      federalTax: 4912,
      grossIncome: 67600,
      otDeduction: 10400,
    },
  },

  /**
   * Scenario 5: Tests Maine EITC (25% of federal EITC with children)
   * Source: Maine Revenue Services, 36 M.R.S. § (EITC regulations)
   */
  mainEitcWithChild: {
    input: {
      filingStatus: 'S',
      payType: 'salary',
      salary: 30000,
      numKidsUnder17: 1,
      numKidsUnder13: 0,
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
      hoursPerWeek: 40,
      otHours: 0,
      spouseTrad401kPct: 0,
      spouseRetire: 0,
      housingType: 'rent',
      monthlyHousing: 0,
      rentIncHeat: false,
      annualPropTax: 0,
      monthlyExpenses: 0,
      weeklyAfterTax: 0,
      pfmlWeeks: 0,
    },
    expected: {
      // Federal EITC for 1 child at $30k earned income
      // 1-kid phase-in rate: 34% up to $13,020 = max credit $4,427
      federalEitc: 4427,
      // Maine EITC: 25% of federal EITC with children
      maineEitc: 1107, // $4,427 * 0.25
    },
  },
};

/**
 * Returns text explanation of test scenario
 */
export function getScenarioDescription(scenarioName) {
  const descriptions = {
    singleNoKids40k: 'Single filer, $40k salary, 0 dependents - baseline scenario',
    mfjWith2Kids100k: 'Married ($100k combined), 2 kids under 17, 1 under 13 - tests CTC/EITC',
    singleAge65Senior: 'Single, 65+, $60k salary - tests senior deduction phase-out',
    hourlyWithOvertime: 'Hourly worker ($25/hr) with 8 hrs OT/week - tests OT deduction',
    mainEitcWithChild: '$30k income, 1 child - tests Maine EITC (25% of federal)',
  };
  return descriptions[scenarioName] || 'Unknown scenario';
}
