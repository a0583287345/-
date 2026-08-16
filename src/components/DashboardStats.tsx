import { Users, DollarSign, RefreshCw, BookOpen } from 'lucide-react';

interface StatsProps {
  totalDonors: number;
  totalsByCurrency: Record<string, number>;
  activeRecurring: number;
  yissacharZevulunCount: number;
}

export default function DashboardStats({
  totalDonors,
  totalsByCurrency,
  activeRecurring,
  yissacharZevulunCount,
  
}: StatsProps) {
  const currencySymbols: Record<string, string> = {
    ILS: '₪',
    USD: '$',
    EUR: '€',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-1">סה"כ תורמים במערכת</span>
          <span className="text-2xl font-bold text-slate-800">{totalDonors}</span>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <Users className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-1">סה"כ תרומות לפי מטבע</span>
          <div className="space-y-1 mt-1">
            <div className="text-base font-bold text-slate-800">
              ₪{(totalsByCurrency['ILS'] || 0).toLocaleString()}
            </div>
            <div className="text-xs font-medium text-slate-600">
              ${(totalsByCurrency['USD'] || 0).toLocaleString()} | €{(totalsByCurrency['EUR'] || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-1">הוראות קבע פעילות</span>
          <span className="text-2xl font-bold text-slate-800">{activeRecurring}</span>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <RefreshCw className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-1">הסכמי יששכר וזבולון</span>
          <span className="text-2xl font-bold text-slate-800">{yissacharZevulunCount}</span>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <BookOpen className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}