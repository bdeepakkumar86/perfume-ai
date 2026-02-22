import { cn } from '@/lib/format';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'emerald' | 'red' | 'blue' | 'amber' | 'gray';
}

const colorMap = {
  emerald: 'bg-emerald-50 border-emerald-200',
  red: 'bg-red-50 border-red-200',
  blue: 'bg-blue-50 border-blue-200',
  amber: 'bg-amber-50 border-amber-200',
  gray: 'bg-gray-50 border-gray-200',
};

const valueColorMap = {
  emerald: 'text-emerald-700',
  red: 'text-red-700',
  blue: 'text-blue-700',
  amber: 'text-amber-700',
  gray: 'text-gray-700',
};

export default function StatCard({ label, value, subtitle, trend, color = 'gray' }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-4 sm:p-5', colorMap[color])}>
      <p className="text-xs sm:text-sm font-medium text-gray-600">{label}</p>
      <p className={cn('text-xl sm:text-2xl font-bold mt-1', valueColorMap[color])}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          {trend === 'up' && <span className="text-emerald-500">&#x25B2;</span>}
          {trend === 'down' && <span className="text-red-500">&#x25BC;</span>}
          {subtitle}
        </p>
      )}
    </div>
  );
}
