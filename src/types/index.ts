export interface Debt {
  id: string;
  name: string;
  type: 'credit_card' | 'personal_loan' | 'student_loan' | 'auto_loan' | 'mortgage' | 'medical' | 'other';
  balance: number;
  interestRate: number; // APR as percentage e.g. 24.99
  minimumPayment: number;
  dueDate: number; // day of month 1-31
  source: 'manual' | 'linked';
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO date string
  isRecurring: boolean;
  necessity: 'essential' | 'discretionary' | 'wasteful' | 'unclassified';
  source: 'manual' | 'linked';
  createdAt: string;
}

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'dining_out'
  | 'transportation'
  | 'insurance'
  | 'healthcare'
  | 'entertainment'
  | 'subscriptions'
  | 'shopping'
  | 'personal_care'
  | 'education'
  | 'savings'
  | 'debt_payment'
  | 'other';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  groceries: 'Groceries',
  dining_out: 'Dining Out',
  transportation: 'Transportation',
  insurance: 'Insurance',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  personal_care: 'Personal Care',
  education: 'Education',
  savings: 'Savings',
  debt_payment: 'Debt Payment',
  other: 'Other',
};

export const DEBT_TYPE_LABELS: Record<Debt['type'], string> = {
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  auto_loan: 'Auto Loan',
  mortgage: 'Mortgage',
  medical: 'Medical Debt',
  other: 'Other',
};

export type PayoffStrategy = 'snowball' | 'avalanche' | 'hybrid';

export interface PayoffPlan {
  strategy: PayoffStrategy;
  monthlyExtraPayment: number;
  schedule: PayoffMonth[];
  totalInterestPaid: number;
  totalPaid: number;
  payoffDate: string;
  monthsToPayoff: number;
  interestSaved: number; // vs minimum-only payments
}

export interface PayoffMonth {
  month: number;
  date: string;
  debts: DebtMonthDetail[];
  totalPaid: number;
  totalInterest: number;
  totalBalance: number;
}

export interface DebtMonthDetail {
  debtId: string;
  debtName: string;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface LLMAnalysis {
  unnecessaryExpenses: ExpenseRecommendation[];
  monthlySavingsPotential: number;
  debtPayoffSuggestion: string;
  priorityActions: string[];
}

export interface ExpenseRecommendation {
  expenseId: string;
  description: string;
  amount: number;
  reason: string;
  suggestedAction: 'eliminate' | 'reduce' | 'keep';
  potentialSaving: number;
}

export interface LinkedAccount {
  id: string;
  institution: string;
  accountType: 'checking' | 'savings' | 'credit_card';
  lastFour: string;
  linkedAt: string;
}
