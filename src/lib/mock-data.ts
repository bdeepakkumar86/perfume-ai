import { Debt, Expense, LinkedAccount } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simulates account linking by generating realistic mock data.
 * In production, this would integrate with Plaid or similar services.
 */
export function generateMockLinkedExpenses(): Expense[] {
  const now = new Date();
  const expenses: Expense[] = [];

  const mockTransactions = [
    { description: 'Netflix Subscription', amount: 15.99, category: 'subscriptions' as const, isRecurring: true, necessity: 'discretionary' as const },
    { description: 'Spotify Premium', amount: 10.99, category: 'subscriptions' as const, isRecurring: true, necessity: 'discretionary' as const },
    { description: 'Hulu + Live TV', amount: 76.99, category: 'subscriptions' as const, isRecurring: true, necessity: 'wasteful' as const },
    { description: 'Starbucks Coffee', amount: 6.45, category: 'dining_out' as const, isRecurring: false, necessity: 'discretionary' as const },
    { description: 'Uber Eats Delivery', amount: 34.50, category: 'dining_out' as const, isRecurring: false, necessity: 'wasteful' as const },
    { description: 'Walmart Groceries', amount: 156.32, category: 'groceries' as const, isRecurring: false, necessity: 'essential' as const },
    { description: 'Shell Gas Station', amount: 52.00, category: 'transportation' as const, isRecurring: false, necessity: 'essential' as const },
    { description: 'Amazon Purchase - Electronics', amount: 89.99, category: 'shopping' as const, isRecurring: false, necessity: 'discretionary' as const },
    { description: 'Gym Membership', amount: 49.99, category: 'personal_care' as const, isRecurring: true, necessity: 'discretionary' as const },
    { description: 'AT&T Phone Bill', amount: 85.00, category: 'utilities' as const, isRecurring: true, necessity: 'essential' as const },
    { description: 'Electric Bill', amount: 142.50, category: 'utilities' as const, isRecurring: true, necessity: 'essential' as const },
    { description: 'DoorDash Lunch', amount: 22.75, category: 'dining_out' as const, isRecurring: false, necessity: 'wasteful' as const },
    { description: 'Target Household Items', amount: 67.34, category: 'shopping' as const, isRecurring: false, necessity: 'discretionary' as const },
    { description: 'MoviePass Subscription', amount: 19.99, category: 'entertainment' as const, isRecurring: true, necessity: 'discretionary' as const },
    { description: 'Rent Payment', amount: 1650.00, category: 'housing' as const, isRecurring: true, necessity: 'essential' as const },
    { description: 'Car Insurance', amount: 165.00, category: 'insurance' as const, isRecurring: true, necessity: 'essential' as const },
    { description: 'Health Insurance', amount: 320.00, category: 'insurance' as const, isRecurring: true, necessity: 'essential' as const },
    { description: 'Online Course - Udemy', amount: 12.99, category: 'education' as const, isRecurring: false, necessity: 'discretionary' as const },
    { description: 'Happy Hour Drinks', amount: 45.00, category: 'entertainment' as const, isRecurring: false, necessity: 'wasteful' as const },
    { description: 'Cloud Storage Subscription', amount: 9.99, category: 'subscriptions' as const, isRecurring: true, necessity: 'discretionary' as const },
  ];

  mockTransactions.forEach((t, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 2); // spread across ~40 days
    expenses.push({
      id: uuidv4(),
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: date.toISOString().split('T')[0],
      isRecurring: t.isRecurring,
      necessity: t.necessity,
      source: 'linked',
      createdAt: new Date().toISOString(),
    });
  });

  return expenses;
}

export function generateMockLinkedDebts(): Debt[] {
  return [
    {
      id: uuidv4(),
      name: 'Chase Sapphire Credit Card',
      type: 'credit_card',
      balance: 4850.00,
      interestRate: 24.99,
      minimumPayment: 97.00,
      dueDate: 15,
      source: 'linked',
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: 'Capital One Quicksilver',
      type: 'credit_card',
      balance: 2300.00,
      interestRate: 21.49,
      minimumPayment: 46.00,
      dueDate: 22,
      source: 'linked',
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: 'Federal Student Loan',
      type: 'student_loan',
      balance: 28500.00,
      interestRate: 5.50,
      minimumPayment: 320.00,
      dueDate: 1,
      source: 'linked',
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: 'Toyota Auto Loan',
      type: 'auto_loan',
      balance: 12750.00,
      interestRate: 6.99,
      minimumPayment: 285.00,
      dueDate: 5,
      source: 'linked',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function generateMockLinkedAccount(type: 'checking' | 'credit_card'): LinkedAccount {
  const institutions: Record<string, string[]> = {
    checking: ['Chase', 'Bank of America', 'Wells Fargo', 'Citi'],
    credit_card: ['Capital One', 'Discover', 'American Express', 'Chase'],
  };
  const pool = institutions[type] || institutions.checking;
  const institution = pool[Math.floor(Math.random() * pool.length)];
  const lastFour = String(Math.floor(1000 + Math.random() * 9000));

  return {
    id: uuidv4(),
    institution,
    accountType: type,
    lastFour,
    linkedAt: new Date().toISOString(),
  };
}
