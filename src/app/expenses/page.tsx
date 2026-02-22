'use client';

import { useState, useEffect } from 'react';
import { Expense, EXPENSE_CATEGORY_LABELS } from '@/types';
import { getExpenses, saveExpenses, addExpense, deleteExpense } from '@/lib/storage';
import { generateMockLinkedExpenses } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/format';
import ExpenseForm from '@/components/ExpenseForm';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setExpenses(getExpenses());
  }, []);

  const handleSave = (expense: Expense) => {
    if (editingExpense) {
      const updated = expenses.map((e) => (e.id === expense.id ? expense : e));
      saveExpenses(updated);
      setExpenses(updated);
    } else {
      addExpense(expense);
      setExpenses([...expenses, expense]);
    }
    setShowForm(false);
    setEditingExpense(undefined);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this expense?')) return;
    deleteExpense(id);
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleLinkAccount = () => {
    setLinking(true);
    // Simulate account linking delay
    setTimeout(() => {
      const mockExpenses = generateMockLinkedExpenses();
      const all = [...expenses, ...mockExpenses];
      saveExpenses(all);
      setExpenses(all);
      setLinking(false);
    }, 2000);
  };

  const filteredExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter((e) => e.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const sortedExpenses = [...filteredExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const necessityColors = {
    essential: 'bg-green-100 text-green-700',
    discretionary: 'bg-amber-100 text-amber-700',
    wasteful: 'bg-red-100 text-red-700',
    unclassified: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your expenses to find savings opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLinkAccount}
            disabled={linking}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {linking ? 'Linking...' : 'Link Account'}
          </button>
          <button
            onClick={() => { setEditingExpense(undefined); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <ExpenseForm
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingExpense(undefined); }}
          initialData={editingExpense}
        />
      )}

      {/* Filter and summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{filteredExpenses.length}</span> expenses totaling{' '}
          <span className="font-bold text-gray-900">{formatCurrency(totalExpenses)}</span>
        </div>
      </div>

      {/* Expense list */}
      {sortedExpenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No expenses yet. Add one manually or link your account.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {EXPENSE_CATEGORY_LABELS[expense.category]}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${necessityColors[expense.necessity]}`}>
                        {expense.necessity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                        expense.source === 'linked'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {expense.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
