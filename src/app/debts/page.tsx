'use client';

import { useState, useEffect } from 'react';
import { Debt, DEBT_TYPE_LABELS } from '@/types';
import { getDebts, saveDebts, addDebt, deleteDebt } from '@/lib/storage';
import { generateMockLinkedDebts } from '@/lib/mock-data';
import { formatCurrency, formatPercent } from '@/lib/format';
import DebtForm from '@/components/DebtForm';

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>();
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setDebts(getDebts());
  }, []);

  const handleSave = (debt: Debt) => {
    if (editingDebt) {
      const updated = debts.map((d) => (d.id === debt.id ? debt : d));
      saveDebts(updated);
      setDebts(updated);
    } else {
      addDebt(debt);
      setDebts([...debts, debt]);
    }
    setShowForm(false);
    setEditingDebt(undefined);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this debt?')) return;
    deleteDebt(id);
    setDebts(debts.filter((d) => d.id !== id));
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setShowForm(true);
  };

  const handleLinkAccount = () => {
    setLinking(true);
    setTimeout(() => {
      const mockDebts = generateMockLinkedDebts();
      const all = [...debts, ...mockDebts];
      saveDebts(all);
      setDebts(all);
      setLinking(false);
    }, 2000);
  };

  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const highestRate = debts.length > 0 ? Math.max(...debts.map((d) => d.interestRate)) : 0;

  // Sort: highest interest rate first
  const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);

  const typeIcons: Record<string, string> = {
    credit_card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    personal_loan: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    student_loan: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
    auto_loan: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z',
    mortgage: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
    medical: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    other: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your debts and track balances</p>
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
            onClick={() => { setEditingDebt(undefined); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Debt
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <DebtForm
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingDebt(undefined); }}
          initialData={editingDebt}
        />
      )}

      {/* Summary */}
      {debts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-600">Total Balance</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-600">Monthly Minimums</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(totalMinPayments)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-600">Highest Rate</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{formatPercent(highestRate)}</p>
          </div>
        </div>
      )}

      {/* Debt cards */}
      {sortedDebts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No debts added yet. Add one manually or link your account to import.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedDebts.map((debt) => {
            const monthlyInterest = (debt.balance * debt.interestRate / 100 / 12);
            return (
              <div key={debt.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[debt.type] || typeIcons.other} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{debt.name}</h3>
                      <p className="text-xs text-gray-500">{DEBT_TYPE_LABELS[debt.type]}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(debt)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(debt.balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">APR</p>
                    <p className="text-lg font-bold text-red-600">{formatPercent(debt.interestRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Min. Payment</p>
                    <p className="text-sm font-medium text-gray-700">{formatCurrency(debt.minimumPayment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monthly Interest</p>
                    <p className="text-sm font-medium text-red-600">{formatCurrency(monthlyInterest)}</p>
                  </div>
                </div>

                {/* Interest cost visualization */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Interest portion of min. payment</span>
                    <span>{Math.round((monthlyInterest / debt.minimumPayment) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (monthlyInterest / debt.minimumPayment) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                    debt.source === 'linked'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {debt.source === 'linked' ? 'Linked' : 'Manual'}
                  </span>
                  <span className="text-xs text-gray-400">Due: {debt.dueDate}th of month</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
