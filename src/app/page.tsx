'use client';

import { useState, useEffect, useCallback } from 'react';
import { Debt, Expense, LLMAnalysis } from '@/types';
import { getDebts, getExpenses, getApiKey } from '@/lib/storage';
import { compareStrategies, STRATEGY_LABELS } from '@/lib/payoff-engine';
import { formatCurrency, formatPercent } from '@/lib/format';
import StatCard from '@/components/StatCard';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

const CHART_COLORS = ['#059669', '#0284c7', '#d97706', '#dc2626', '#7c3aed', '#ec4899'];

export default function Dashboard() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [analysis, setAnalysis] = useState<LLMAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extraPayment, setExtraPayment] = useState(200);

  useEffect(() => {
    setDebts(getDebts());
    setExpenses(getExpenses());
  }, []);

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const avgRate = debts.length > 0
    ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
    : 0;
  const monthlyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const recurringExpenses = expenses.filter((e) => e.isRecurring).reduce((sum, e) => sum + e.amount, 0);

  const plans = debts.length > 0 ? compareStrategies(debts, extraPayment) : [];
  const bestPlan = plans[0];

  // Payoff timeline chart data
  const timelineData = bestPlan?.schedule
    .filter((_, i) => i % 3 === 0 || i === bestPlan.schedule.length - 1)
    .map((m) => ({
      month: `Mo ${m.month}`,
      balance: Math.round(m.totalBalance),
    })) || [];

  // Expense breakdown by category
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const pieData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.replace('_', ' '), value: Math.round(value * 100) / 100 }));

  // Strategy comparison data
  const strategyComparisonData = plans.map((p) => ({
    strategy: STRATEGY_LABELS[p.strategy],
    interest: Math.round(p.totalInterestPaid),
    months: p.monthsToPayoff,
  }));

  const runAnalysis = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert('Please add your Anthropic API key in the Settings page first.');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses, debts, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [expenses, debts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your financial overview and debt payoff progress</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing || (expenses.length === 0 && debts.length === 0)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {analyzing ? 'Analyzing...' : 'AI Expense Analysis'}
        </button>
      </div>

      {/* Empty state */}
      {debts.length === 0 && expenses.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-3 text-lg font-medium text-gray-900">Get started with DebtFree</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Add your debts and expenses to see your personalized payoff plan and savings projections.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/debts"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
            >
              Add Your Debts
            </Link>
            <Link
              href="/expenses"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Track Expenses
            </Link>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {(debts.length > 0 || expenses.length > 0) && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Debt" value={formatCurrency(totalDebt)} color="red" />
            <StatCard label="Monthly Min. Payments" value={formatCurrency(totalMinPayments)} color="amber" />
            <StatCard label="Avg Interest Rate" value={formatPercent(avgRate)} color="blue" />
            <StatCard
              label="Interest Saved"
              value={bestPlan ? formatCurrency(bestPlan.interestSaved) : '$0'}
              subtitle={bestPlan ? `with ${STRATEGY_LABELS[bestPlan.strategy]}` : undefined}
              color="emerald"
              trend="up"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Monthly Expenses" value={formatCurrency(monthlyExpenses)} color="gray" />
            <StatCard label="Recurring Expenses" value={formatCurrency(recurringExpenses)} color="amber" />
            <StatCard label="Debt-Free In" value={bestPlan ? `${bestPlan.monthsToPayoff} mo` : 'N/A'} color="emerald" />
            <StatCard label="Total Debts" value={String(debts.length)} color="blue" />
          </div>
        </>
      )}

      {/* Charts */}
      {debts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payoff Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Payoff Timeline</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Extra/mo:</label>
                <input
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="balance" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown */}
          {pieData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Expense Breakdown</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Strategy Comparison */}
          {strategyComparisonData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Strategy Comparison</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={strategyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="strategy" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => name === 'interest' ? formatCurrency(Number(value)) : `${value} months`} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="interest" name="Total Interest" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="months" name="Months to Payoff" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis Results */}
      {analysis && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">AI Analysis</h2>
          </div>

          {/* Monthly savings potential */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-sm text-emerald-800">
              <span className="font-bold">Potential Monthly Savings: </span>
              {formatCurrency(analysis.monthlySavingsPotential)}
            </p>
            <p className="text-sm text-emerald-700 mt-1">{analysis.debtPayoffSuggestion}</p>
          </div>

          {/* Priority actions */}
          {analysis.priorityActions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Priority Actions</h3>
              <ol className="list-decimal list-inside space-y-1">
                {analysis.priorityActions.map((action, i) => (
                  <li key={i} className="text-sm text-gray-700">{action}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Unnecessary expenses */}
          {analysis.unnecessaryExpenses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Expense Recommendations</h3>
              <div className="space-y-2">
                {analysis.unnecessaryExpenses.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                      rec.suggestedAction === 'eliminate'
                        ? 'bg-red-100 text-red-700'
                        : rec.suggestedAction === 'reduce'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {rec.suggestedAction}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {rec.description} — {formatCurrency(rec.amount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
                      {rec.potentialSaving > 0 && (
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                          Save {formatCurrency(rec.potentialSaving)}/month
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
