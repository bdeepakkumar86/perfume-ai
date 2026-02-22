import { Debt, Expense, LinkedAccount } from '@/types';

const STORAGE_KEYS = {
  DEBTS: 'debtfree_debts',
  EXPENSES: 'debtfree_expenses',
  LINKED_ACCOUNTS: 'debtfree_linked_accounts',
  API_KEY: 'debtfree_api_key',
};

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Debts
export function getDebts(): Debt[] {
  return getItem<Debt[]>(STORAGE_KEYS.DEBTS, []);
}

export function saveDebts(debts: Debt[]): void {
  setItem(STORAGE_KEYS.DEBTS, debts);
}

export function addDebt(debt: Debt): void {
  const debts = getDebts();
  debts.push(debt);
  saveDebts(debts);
}

export function updateDebt(updated: Debt): void {
  const debts = getDebts().map((d) => (d.id === updated.id ? updated : d));
  saveDebts(debts);
}

export function deleteDebt(id: string): void {
  saveDebts(getDebts().filter((d) => d.id !== id));
}

// Expenses
export function getExpenses(): Expense[] {
  return getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
}

export function saveExpenses(expenses: Expense[]): void {
  setItem(STORAGE_KEYS.EXPENSES, expenses);
}

export function addExpense(expense: Expense): void {
  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);
}

export function updateExpense(updated: Expense): void {
  const expenses = getExpenses().map((e) => (e.id === updated.id ? updated : e));
  saveExpenses(expenses);
}

export function deleteExpense(id: string): void {
  saveExpenses(getExpenses().filter((e) => e.id !== id));
}

// Linked Accounts
export function getLinkedAccounts(): LinkedAccount[] {
  return getItem<LinkedAccount[]>(STORAGE_KEYS.LINKED_ACCOUNTS, []);
}

export function saveLinkedAccounts(accounts: LinkedAccount[]): void {
  setItem(STORAGE_KEYS.LINKED_ACCOUNTS, accounts);
}

// API Key
export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

export function saveApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
}
