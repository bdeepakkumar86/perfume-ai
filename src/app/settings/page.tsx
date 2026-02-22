'use client';

import { useState, useEffect } from 'react';
import { getApiKey, saveApiKey, getLinkedAccounts, saveLinkedAccounts, saveDebts, saveExpenses, getDebts, getExpenses } from '@/lib/storage';
import { generateMockLinkedAccount } from '@/lib/mock-data';
import type { LinkedAccount } from '@/types';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setApiKey(getApiKey());
    setLinkedAccounts(getLinkedAccounts());
  }, []);

  const handleSaveKey = () => {
    saveApiKey(apiKey);
    setSavedKey(true);
    setTimeout(() => setSavedKey(false), 2000);
  };

  const handleLinkNewAccount = (type: 'checking' | 'credit_card') => {
    setLinking(true);
    setTimeout(() => {
      const account = generateMockLinkedAccount(type);
      const updated = [...linkedAccounts, account];
      saveLinkedAccounts(updated);
      setLinkedAccounts(updated);
      setLinking(false);
    }, 1500);
  };

  const handleUnlinkAccount = (id: string) => {
    const updated = linkedAccounts.filter((a) => a.id !== id);
    saveLinkedAccounts(updated);
    setLinkedAccounts(updated);
  };

  const handleClearAllData = () => {
    if (!confirm('This will delete ALL your debts, expenses, and linked accounts. Are you sure?')) return;
    saveDebts([]);
    saveExpenses([]);
    saveLinkedAccounts([]);
    setLinkedAccounts([]);
  };

  const debtCount = getDebts().length;
  const expenseCount = getExpenses().length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your DebtFree experience</p>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Anthropic API Key</h2>
        <p className="text-sm text-gray-500 mb-4">
          Required for AI-powered expense analysis and debt payoff recommendations.
          Your key is stored locally in your browser and never sent to our servers.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          <button
            onClick={handleSaveKey}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {savedKey ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Linked Accounts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Linked Accounts</h2>
        <p className="text-sm text-gray-500 mb-4">
          Connect your bank accounts and credit cards to automatically import transactions and balances.
          (Demo mode: generates realistic mock data)
        </p>

        {linkedAccounts.length > 0 && (
          <div className="space-y-2 mb-4">
            {linkedAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.institution}</p>
                    <p className="text-xs text-gray-500">
                      {account.accountType === 'credit_card' ? 'Credit Card' : 'Checking'} ••••{account.lastFour}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlinkAccount(account.id)}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => handleLinkNewAccount('checking')}
            disabled={linking}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {linking ? 'Linking...' : 'Link Bank Account'}
          </button>
          <button
            onClick={() => handleLinkNewAccount('credit_card')}
            disabled={linking}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {linking ? 'Linking...' : 'Link Credit Card'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Data Management</h2>
        <p className="text-sm text-gray-500 mb-4">
          All data is stored locally in your browser. Nothing is sent to external servers
          (except when using AI analysis, which sends expense/debt summaries to Claude).
        </p>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Current Data</p>
            <p className="text-xs text-gray-500">
              {debtCount} debts, {expenseCount} expenses, {linkedAccounts.length} linked accounts
            </p>
          </div>
        </div>
        <button
          onClick={handleClearAllData}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Clear All Data
        </button>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">About DebtFree</h2>
        <p className="text-sm text-gray-500 mb-3">
          DebtFree helps you create a personalized debt payoff plan using proven strategies
          like the Debt Snowball, Debt Avalanche, and Hybrid approaches.
        </p>
        <div className="text-xs text-gray-400 space-y-1">
          <p><span className="font-medium text-gray-600">Snowball:</span> Pay smallest debts first for quick wins</p>
          <p><span className="font-medium text-gray-600">Avalanche:</span> Pay highest interest first to save the most</p>
          <p><span className="font-medium text-gray-600">Hybrid:</span> Balance between rate and balance size</p>
        </div>
      </div>
    </div>
  );
}
