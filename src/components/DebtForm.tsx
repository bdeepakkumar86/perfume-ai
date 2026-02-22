'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Debt, DEBT_TYPE_LABELS } from '@/types';

interface DebtFormProps {
  onSave: (debt: Debt) => void;
  onCancel: () => void;
  initialData?: Debt;
}

export default function DebtForm({ onSave, onCancel, initialData }: DebtFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<Debt['type']>(initialData?.type || 'credit_card');
  const [balance, setBalance] = useState(initialData?.balance?.toString() || '');
  const [interestRate, setInterestRate] = useState(initialData?.interestRate?.toString() || '');
  const [minimumPayment, setMinimumPayment] = useState(initialData?.minimumPayment?.toString() || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate?.toString() || '15');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const debt: Debt = {
      id: initialData?.id || uuidv4(),
      name,
      type,
      balance: parseFloat(balance),
      interestRate: parseFloat(interestRate),
      minimumPayment: parseFloat(minimumPayment),
      dueDate: parseInt(dueDate),
      source: 'manual',
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };
    onSave(debt);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900">
        {initialData ? 'Edit Debt' : 'Add New Debt'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Debt Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Chase Visa Card"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Debt Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Debt['type'])}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            {Object.entries(DEBT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="5000.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (APR %)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="24.99"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Payment ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={minimumPayment}
            onChange={(e) => setMinimumPayment(e.target.value)}
            placeholder="100.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Day of Month)</label>
          <input
            type="number"
            min="1"
            max="31"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          {initialData ? 'Update Debt' : 'Add Debt'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
