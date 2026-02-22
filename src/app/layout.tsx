import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'DebtFree - Smart Debt Payoff Planner',
  description:
    'Track expenses, manage debts, and create a personalized payoff plan using AI-powered analysis. Compare Snowball, Avalanche, and Hybrid strategies.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        <Navigation />
        <div className="md:pl-64">
          <main className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
