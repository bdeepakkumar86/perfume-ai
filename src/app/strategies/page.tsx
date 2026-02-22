'use client';

import { useState, useEffect } from 'react';
import { Debt } from '@/types';
import { getDebts, getExpenses, getApiKey } from '@/lib/storage';
import { compareStrategies, STRATEGY_LABELS, STRATEGY_DESCRIPTIONS } from '@/lib/payoff-engine';
import { formatCurrency, formatMonthYear, cn } from '@/lib/format';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { LLMAnalysis } from '@/types';

const STRATEGY_COLORS = {
  avalanche: '#059669',
  snowball: '#0284c7',
  hybrid: '#d97706',
};

export default function StrategiesPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [extraPayment, setExtraPayment] = useState(200);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [llmAdvice, setLlmAdvice] = useState<LLMAnalysis | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    setDebts(getDebts());
  }, []);

  const plans = debts.length > 0 ? compareStrategies(debts, extraPayment) : [];

  // Build comparison chart data
  const maxMonths = Math.max(...plans.map((p) => p.monthsToPayoff), 0);
  const comparisonData: Record<string, unknown>[] = [];
  for (let i = 0; i <= maxMonths; i += 3) {
    const point: Record<string, unknown> = { month: `Mo ${i}` };
    plans.forEach((p) => {
      const scheduleEntry = p.schedule.find((s) => s.month === i) || p.schedule[p.schedule.length - 1];
      point[STRATEGY_LABELS[p.strategy]] = scheduleEntry
        ? Math.round(i <= p.monthsToPayoff ? scheduleEntry.totalBalance : 0)
        : 0;
    });
    comparisonData.push(point);
  }

  const activePlan = selectedStrategy
    ? plans.find((p) => p.strategy === selectedStrategy) || plans[0]
    : plans[0];

  const getAIAdvice = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert('Please add your Anthropic API key in Settings first.');
      return;
    }
    setLoadingAdvice(true);
    try {
      const expenses = getExpenses();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses, debts, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLlmAdvice(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to get AI advice');
    } finally {
      setLoadingAdvice(false);
    }
  };

  if (debts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Payoff Strategies</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Add some debts first to see payoff strategy comparisons.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payoff Strategies</h1>
          <p className="text-sm text-gray-500 mt-1">Compare strategies and find the best plan for you</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Extra Monthly Payment:</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, index) => (
          <button
            key={plan.strategy}
            onClick={() => setSelectedStrategy(plan.strategy)}
            className={cn(
              'text-left rounded-xl border-2 p-5 transition-all hover:shadow-md',
              (selectedStrategy || plans[0]?.strategy) === plan.strategy
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 bg-white'
            )}
          >
            {index === 0 && (
              <span className="inline-flex px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded-full mb-2">
                RECOMMENDED
              </span>
            )}
            <h3 className="font-bold text-gray-900 text-lg">{STRATEGY_LABELS[plan.strategy]}</h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {STRATEGY_DESCRIPTIONS[plan.strategy]}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Interest</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(plan.totalInterestPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Interest Saved</span>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(plan.interestSaved)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Months to Payoff</span>
                <span className="text-sm font-bold text-gray-900">{plan.monthsToPayoff}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Debt-Free By</span>
                <span className="text-sm font-bold text-gray-900">{formatMonthYear(plan.payoffDate)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Comparison chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Balance Over Time — All Strategies</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            {plans.map((p) => (
              <Line
                key={p.strategy}
                type="monotone"
                dataKey={STRATEGY_LABELS[p.strategy]}
                stroke={STRATEGY_COLORS[p.strategy as keyof typeof STRATEGY_COLORS]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed schedule for selected strategy */}
      {activePlan && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Payment Schedule — {STRATEGY_LABELS[activePlan.strategy]}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  {debts.map((d) => (
                    <th key={d.id} className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      {d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Paid</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activePlan.schedule
                  .filter((_, i) => i < 24 || i === activePlan.schedule.length - 1)
                  .map((month) => (
                  <tr key={month.month} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-600">{month.month}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{formatMonthYear(month.date)}</td>
                    {debts.map((d) => {
                      const detail = month.debts.find((dd) => dd.debtId === d.id);
                      return (
                        <td key={d.id} className="px-3 py-2 text-sm text-right">
                          {detail && detail.remainingBalance > 0 ? (
                            <span className="text-gray-900">{formatCurrency(detail.remainingBalance)}</span>
                          ) : detail ? (
                            <span className="text-emerald-600 font-medium">PAID OFF</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(month.totalPaid)}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-right">
                      <span className={month.totalBalance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {formatCurrency(month.totalBalance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activePlan.schedule.length > 24 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Showing first 24 months and final month. Total: {activePlan.monthsToPayoff} months.
            </p>
          )}
        </div>
      )}

      {/* AI Advice Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">AI-Powered Debt Payoff Advice</h2>
          <button
            onClick={getAIAdvice}
            disabled={loadingAdvice}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loadingAdvice ? 'Analyzing...' : 'Get AI Advice'}
          </button>
        </div>

        {!llmAdvice && !loadingAdvice && (
          <p className="text-sm text-gray-500">
            Click &quot;Get AI Advice&quot; to receive personalized recommendations on which expenses
            to cut and how to accelerate your debt payoff. Requires an Anthropic API key (set in Settings).
          </p>
        )}

        {llmAdvice && (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-emerald-800">
                Potential Monthly Savings: {formatCurrency(llmAdvice.monthlySavingsPotential)}
              </p>
              <p className="text-sm text-emerald-700 mt-1">{llmAdvice.debtPayoffSuggestion}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Top Actions</h3>
              <ol className="list-decimal list-inside space-y-1">
                {llmAdvice.priorityActions.map((action, i) => (
                  <li key={i} className="text-sm text-gray-700">{action}</li>
                ))}
              </ol>
            </div>

            {llmAdvice.unnecessaryExpenses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Redirect These Expenses to Debt Payments
                </h3>
                <div className="space-y-2">
                  {llmAdvice.unnecessaryExpenses
                    .filter((e) => e.suggestedAction !== 'keep')
                    .map((rec, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                        rec.suggestedAction === 'eliminate'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {rec.suggestedAction}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{rec.description}</span>
                        <span className="text-sm text-gray-500"> — {rec.reason}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">
                        +{formatCurrency(rec.potentialSaving)}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
