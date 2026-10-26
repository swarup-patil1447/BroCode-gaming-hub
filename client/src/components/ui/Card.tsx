import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'cyan' | 'magenta' | 'glow';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'glass',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-dark-900 border-slate-800',
    glass: 'glass-card',
    cyan: 'bg-dark-900/90 border-cyber-cyan/30 shadow-glow-cyan/20',
    magenta: 'bg-dark-900/90 border-cyber-magenta/30 shadow-glow-magenta/20',
    glow: 'bg-dark-900 border-slate-700/80 shadow-lg',
  };

  return (
    <div
      className={cn('rounded-2xl border p-5 transition-all duration-200', variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};
