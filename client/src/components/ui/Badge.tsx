import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'available' | 'booked' | 'active' | 'maintenance' | 'paid' | 'unpaid' | 'partial' | 'cancelled' | 'cyan' | 'magenta' | 'default';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className,
  dot = false,
}) => {
  const variantStyles = {
    available: 'bg-emerald-950/80 text-cyber-green border-emerald-500/40',
    booked: 'bg-rose-950/80 text-cyber-red border-rose-500/40',
    active: 'bg-cyan-950/80 text-cyber-cyan border-cyber-cyan/40',
    maintenance: 'bg-amber-950/80 text-cyber-amber border-amber-500/40',
    paid: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40',
    unpaid: 'bg-rose-950/80 text-rose-400 border-rose-500/40',
    partial: 'bg-amber-950/80 text-amber-400 border-amber-500/40',
    cancelled: 'bg-slate-900 text-slate-400 border-slate-700',
    cyan: 'bg-cyan-950/80 text-cyber-cyan border-cyber-cyan/40',
    magenta: 'bg-fuchsia-950/80 text-cyber-magenta border-cyber-magenta/40',
    default: 'bg-dark-800 text-slate-300 border-slate-700',
  };

  const dotColors = {
    available: 'bg-cyber-green',
    booked: 'bg-cyber-red',
    active: 'bg-cyber-cyan',
    maintenance: 'bg-cyber-amber',
    paid: 'bg-emerald-400',
    unpaid: 'bg-rose-400',
    partial: 'bg-amber-400',
    cancelled: 'bg-slate-400',
    cyan: 'bg-cyber-cyan',
    magenta: 'bg-cyber-magenta',
    default: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  );
};
