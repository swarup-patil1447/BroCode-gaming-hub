import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { X, CheckCheck, Bell, Gamepad2, CreditCard, Clock, UtensilsCrossed } from 'lucide-react';
import { formatDate, formatTime } from '../../lib/utils';
import { NotificationItem } from '../../types';

export const NotificationDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.getAll(),
    enabled: isOpen,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markSingleMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!isOpen) return null;

  const notifications = data?.data || [];

  const getIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_RECEIVED':
        return <CreditCard className="h-4 w-4 text-cyber-green" />;
      case 'SESSION_ENDED':
      case 'SESSION_ENDING':
        return <Clock className="h-4 w-4 text-cyber-red" />;
      case 'FOOD_ORDER':
        return <UtensilsCrossed className="h-4 w-4 text-cyber-amber" />;
      case 'NEW_BOOKING':
      case 'BOOKING_REMINDER':
        return <Gamepad2 className="h-4 w-4 text-cyber-cyan" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-dark-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyber-cyan" />
              <h3 className="font-bold text-white text-base">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {notifications.some((n) => !n.isRead) && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-cyber-cyan hover:underline flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markSingleMutation.mutate(n.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    n.isRead
                      ? 'bg-dark-950/40 border-slate-800/60 opacity-80'
                      : 'bg-dark-850 border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-dark-900 border border-slate-700/60 shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold ${n.isRead ? 'text-slate-300' : 'text-white'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
