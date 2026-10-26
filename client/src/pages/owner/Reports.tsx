import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency, formatDuration, formatDate } from '../../lib/utils';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  DollarSign,
  Gamepad2,
  UtensilsCrossed,
  CreditCard,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const Reports: React.FC = () => {
  const [period, setPeriod] = useState<string>('month');

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => api.reports.getReports({ period }),
  });

  const handleExportCSV = () => {
    if (!report) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Revenue,Gaming,Food,Bookings\n';

    report.dailyBreakdown.forEach((row) => {
      csvContent += `${row.date},${row.revenue},${row.gaming},${row.food},${row.bookings}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brocode_report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = report?.summary;
  const paymentMethods = report?.paymentMethods || {};
  const stationUsage = report?.stationUsage || [];
  const employeeActivity = report?.employeeActivity || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            FINANCIAL & OPERATIONAL REPORTS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Revenue breakdown, table utilization, food sales, and staff audit reports
          </p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-dark-900 border border-slate-800 w-fit no-print">
        {[
          { id: 'day', label: 'Today' },
          { id: 'week', label: 'Last 7 Days' },
          { id: 'month', label: 'Last 30 Days' },
          { id: 'year', label: 'Past Year' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              period === p.id
                ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">Total Revenue</span>
            <DollarSign className="h-4 w-4 text-cyber-green" />
          </div>
          <p className="font-display font-black text-2xl text-white">
            {formatCurrency(summary?.totalRevenue || 0)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">Gaming Revenue</span>
            <Gamepad2 className="h-4 w-4 text-cyber-cyan" />
          </div>
          <p className="font-display font-black text-2xl text-cyber-cyan">
            {formatCurrency(summary?.totalGamingRevenue || 0)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">Food & Drinks</span>
            <UtensilsCrossed className="h-4 w-4 text-cyber-amber" />
          </div>
          <p className="font-display font-black text-2xl text-cyber-amber">
            {formatCurrency(summary?.totalFoodRevenue || 0)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">Total Bookings</span>
            <BarChart3 className="h-4 w-4 text-cyber-magenta" />
          </div>
          <p className="font-display font-black text-2xl text-cyber-magenta">
            {summary?.totalBookings || 0}
          </p>
        </div>
      </div>

      {/* Payment Method & Staff Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-cyber-cyan" />
            <span>Payment Methods Breakdown</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(paymentMethods).map(([method, amt]) => (
              <div key={method} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{method}</span>
                  <span className="font-mono text-white">{formatCurrency(amt)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-dark-950 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-cyan to-blue-600 rounded-full"
                    style={{
                      width: `${
                        summary?.totalRevenue && summary.totalRevenue > 0
                          ? Math.min(100, Math.round((amt / summary.totalRevenue) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Activity Breakdown */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-cyber-magenta" />
            <span>Employee Activity</span>
          </h3>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {employeeActivity.map((emp) => (
              <div
                key={emp.employeeId}
                className="p-3 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{emp.name}</p>
                  <p className="font-mono text-slate-400 text-[10px]">{emp.employeeId}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-cyber-cyan">{emp.bookingsCount} bookings created</p>
                  <p className="text-slate-400 font-mono">
                    {formatCurrency(emp.paymentsCollected)} collected
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Station Utilization Breakdown (8 Tables) */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
        <h3 className="font-display font-bold text-lg text-white">
          Gaming Stations Utilization (All 8 Tables)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stationUsage.map((st) => (
            <div
              key={st.tableNumber}
              className="p-4 rounded-xl bg-dark-950/80 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-display font-bold text-sm text-white">
                  Table {st.tableNumber}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">
                  {st.deviceType}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Bookings:</span>
                  <span className="font-bold text-white">{st.bookingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Time:</span>
                  <span className="font-bold text-cyber-cyan">{formatDuration(st.totalMinutes)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span>Revenue:</span>
                  <span className="font-bold text-cyber-green font-mono">
                    {formatCurrency(st.revenue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
