import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate, formatTime } from '../../lib/utils';
import { Search, Download, RefreshCw, Filter } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AuditLogItem } from '../../types';

export const AuditLogs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const { data: logs = [], isLoading, isError, error, refetch, isRefetching } = useQuery<AuditLogItem[]>({
    queryKey: ['audit-logs', search, actionFilter],
    queryFn: async () => {
      const result = await api.auditLogs.getAll({ search, action: actionFilter });
      if (Array.isArray(result)) {
        return result;
      }
      if (result && Array.isArray((result as any).data)) {
        return (result as any).data;
      }
      return [];
    },
  });

  const actionCategories = [
    { id: 'ALL', label: 'All Actions' },
    { id: 'LOGIN', label: 'Logins' },
    { id: 'BOOKING_CREATE', label: 'Bookings' },
    { id: 'BOOKING_EXTEND', label: 'Extensions' },
    { id: 'BOOKING_CANCEL', label: 'Cancellations' },
    { id: 'PAYMENT_RECORD', label: 'Payments' },
    { id: 'PRICING_UPDATE', label: 'Pricing Changes' },
    { id: 'FOOD_ORDER_ADD', label: 'Food Orders' },
    { id: 'STATION_STATUS_UPDATE', label: 'Station Status' },
  ];

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'Staff Name', 'Employee ID', 'Role', 'Action', 'Target', 'Details / Change'];
    const rows = logs.map((log) => [
      `"${new Date(log.timestamp).toISOString()}"`,
      `"${log.userName.replace(/"/g, '""')}"`,
      `"${log.userEmpId}"`,
      `"${log.role}"`,
      `"${log.action}"`,
      `"${(log.target || '').replace(/"/g, '""')}"`,
      `"${(log.newValue || log.oldValue || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brocode_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('PAYMENT')) return 'paid';
    if (action.includes('CANCEL') || action.includes('DISABLE')) return 'cancelled';
    if (action.includes('PRICING') || action.includes('PASSWORD')) return 'magenta';
    if (action.includes('EXTEND') || action.includes('FOOD')) return 'default';
    if (action.includes('CREATE') || action.includes('LOGIN')) return 'cyan';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            SYSTEM AUDIT LOGS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable historical audit trail of all staff actions, bookings, price modifications, and payments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={exportCSV}
            disabled={logs.length === 0}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:w-96">
            <Input
              placeholder="Search by staff, action, target, details..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5 text-cyber-cyan shrink-0" />
            <span>Showing {logs.length} logged events</span>
          </div>
        </div>

        {/* Quick Action Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-3">
          {actionCategories.map((act) => (
            <button
              key={act.id}
              onClick={() => setActionFilter(act.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                actionFilter === act.id
                  ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/20'
                  : 'bg-dark-850 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400 text-sm">Loading audit trail...</p>
        ) : isError ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-cyber-red text-sm font-semibold">
              Failed to load audit logs: {(error as any)?.message || 'An error occurred'}
            </p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-12 text-slate-500 text-sm">No audit logs match your search or filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Staff / User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Details / Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-slate-400 shrink-0">
                      <div>{formatDate(log.timestamp)}</div>
                      <div className="text-[10px] text-slate-500">{formatTime(log.timestamp)}</div>
                    </td>
                    <td className="py-3 px-3 font-sans font-bold text-white">
                      {log.userName}
                      <span className="text-[11px] text-slate-400 font-mono block font-normal">
                        {log.userEmpId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={log.role === 'OWNER' ? 'magenta' : 'cyan'}>
                        {log.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-bold">{log.target}</td>
                    <td className="py-3 px-3 text-slate-300 max-w-sm font-sans text-xs break-words">
                      {log.oldValue && (
                        <div className="text-slate-400 line-through text-[11px] mb-0.5">
                          Old: {log.oldValue}
                        </div>
                      )}
                      <div>{log.newValue || log.oldValue || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
