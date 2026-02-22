import { Debt, PayoffPlan, PayoffMonth, DebtMonthDetail, PayoffStrategy } from '@/types';

/**
 * Calculate the minimum-only payoff plan (baseline for interest savings comparison).
 */
function calculateMinimumOnlyPlan(debts: Debt[]): { totalInterest: number; months: number } {
  const balances = debts.map((d) => d.balance);
  const rates = debts.map((d) => d.interestRate / 100 / 12);
  const mins = debts.map((d) => d.minimumPayment);

  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // 50 year cap

  while (balances.some((b) => b > 0.01) && months < maxMonths) {
    months++;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const interest = balances[i] * rates[i];
      totalInterest += interest;
      const payment = Math.min(mins[i], balances[i] + interest);
      balances[i] = balances[i] + interest - payment;
      if (balances[i] < 0.01) balances[i] = 0;
    }
  }

  return { totalInterest, months };
}

/**
 * Sort debts based on the chosen strategy:
 * - Snowball: lowest balance first
 * - Avalanche: highest interest rate first
 * - Hybrid: weighted score of balance and rate
 */
function sortDebtsByStrategy(debts: Debt[], strategy: PayoffStrategy): Debt[] {
  const sorted = [...debts];
  switch (strategy) {
    case 'snowball':
      sorted.sort((a, b) => a.balance - b.balance);
      break;
    case 'avalanche':
      sorted.sort((a, b) => b.interestRate - a.interestRate);
      break;
    case 'hybrid':
      // Score = interestRate * balance (prioritize high-rate debts that also have manageable balances)
      sorted.sort((a, b) => {
        const scoreA = a.interestRate * Math.log(a.balance + 1);
        const scoreB = b.interestRate * Math.log(b.balance + 1);
        return scoreB - scoreA;
      });
      break;
  }
  return sorted;
}

/**
 * Main payoff calculation engine.
 * Simulates month-by-month payments using the chosen strategy.
 */
export function calculatePayoffPlan(
  debts: Debt[],
  strategy: PayoffStrategy,
  monthlyExtraPayment: number
): PayoffPlan {
  if (debts.length === 0) {
    return {
      strategy,
      monthlyExtraPayment,
      schedule: [],
      totalInterestPaid: 0,
      totalPaid: 0,
      payoffDate: new Date().toISOString(),
      monthsToPayoff: 0,
      interestSaved: 0,
    };
  }

  const baseline = calculateMinimumOnlyPlan(debts);
  const orderedDebts = sortDebtsByStrategy(debts, strategy);

  // Track remaining balances by debt ID
  const balances: Record<string, number> = {};
  orderedDebts.forEach((d) => {
    balances[d.id] = d.balance;
  });

  const schedule: PayoffMonth[] = [];
  let totalInterestPaid = 0;
  let totalPaid = 0;
  const maxMonths = 600;

  const startDate = new Date();

  for (let month = 1; month <= maxMonths; month++) {
    const activeDebts = orderedDebts.filter((d) => balances[d.id] > 0.01);
    if (activeDebts.length === 0) break;

    const monthDate = new Date(startDate);
    monthDate.setMonth(monthDate.getMonth() + month);

    const debtDetails: DebtMonthDetail[] = [];
    let monthTotalPaid = 0;
    let monthTotalInterest = 0;

    // Step 1: Apply minimum payments and calculate interest
    let extraAvailable = monthlyExtraPayment;
    const minimumPayments: Record<string, { interest: number; payment: number }> = {};

    for (const debt of orderedDebts) {
      if (balances[debt.id] <= 0.01) continue;
      const monthlyRate = debt.interestRate / 100 / 12;
      const interest = balances[debt.id] * monthlyRate;
      const minPayment = Math.min(debt.minimumPayment, balances[debt.id] + interest);
      minimumPayments[debt.id] = { interest, payment: minPayment };
    }

    // Step 2: Distribute extra payment to priority debt (based on strategy order)
    // Any freed-up minimum payments also roll into the extra pool (snowball effect)
    const priorityOrder = activeDebts; // already sorted by strategy

    // First, apply minimum payments
    for (const debt of orderedDebts) {
      if (balances[debt.id] <= 0.01) {
        // This debt is paid off; its minimum payment goes to extra pool
        extraAvailable += debt.minimumPayment;
        continue;
      }

      const { interest, payment } = minimumPayments[debt.id];
      const principal = payment - interest;
      balances[debt.id] = balances[debt.id] + interest - payment;
      if (balances[debt.id] < 0.01) balances[debt.id] = 0;

      debtDetails.push({
        debtId: debt.id,
        debtName: debt.name,
        payment,
        principal,
        interest,
        remainingBalance: balances[debt.id],
      });

      monthTotalPaid += payment;
      monthTotalInterest += interest;
    }

    // Step 3: Apply extra payment to the first priority debt that still has balance
    for (const debt of priorityOrder) {
      if (extraAvailable <= 0) break;
      if (balances[debt.id] <= 0) continue;

      const extraPayment = Math.min(extraAvailable, balances[debt.id]);
      balances[debt.id] -= extraPayment;
      if (balances[debt.id] < 0.01) balances[debt.id] = 0;
      extraAvailable -= extraPayment;

      // Update the detail entry
      const detail = debtDetails.find((d) => d.debtId === debt.id);
      if (detail) {
        detail.payment += extraPayment;
        detail.principal += extraPayment;
        detail.remainingBalance = balances[debt.id];
      }

      monthTotalPaid += extraPayment;
    }

    totalPaid += monthTotalPaid;
    totalInterestPaid += monthTotalInterest;

    const totalBalance = Object.values(balances).reduce((sum, b) => sum + b, 0);

    schedule.push({
      month,
      date: monthDate.toISOString(),
      debts: debtDetails,
      totalPaid: monthTotalPaid,
      totalInterest: monthTotalInterest,
      totalBalance,
    });

    if (totalBalance < 0.01) break;
  }

  const lastMonth = schedule[schedule.length - 1];
  const payoffDate = lastMonth ? lastMonth.date : new Date().toISOString();
  const monthsToPayoff = schedule.length;
  const interestSaved = Math.max(0, baseline.totalInterest - totalInterestPaid);

  return {
    strategy,
    monthlyExtraPayment,
    schedule,
    totalInterestPaid,
    totalPaid,
    payoffDate,
    monthsToPayoff,
    interestSaved,
  };
}

/**
 * Compare all three strategies and return plans sorted by interest saved.
 */
export function compareStrategies(
  debts: Debt[],
  monthlyExtraPayment: number
): PayoffPlan[] {
  const strategies: PayoffStrategy[] = ['avalanche', 'snowball', 'hybrid'];
  return strategies
    .map((s) => calculatePayoffPlan(debts, s, monthlyExtraPayment))
    .sort((a, b) => a.totalInterestPaid - b.totalInterestPaid);
}

export const STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  snowball: 'Debt Snowball',
  avalanche: 'Debt Avalanche',
  hybrid: 'Hybrid',
};

export const STRATEGY_DESCRIPTIONS: Record<PayoffStrategy, string> = {
  snowball:
    'Pay off smallest balances first for quick wins and motivation. Minimums on everything else, extra goes to the smallest debt.',
  avalanche:
    'Pay off highest interest rate first to minimize total interest paid. Mathematically optimal but requires patience.',
  hybrid:
    'A balanced approach weighing both interest rate and balance size. Targets high-rate debts with manageable balances first.',
};
