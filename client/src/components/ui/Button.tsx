import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'magenta' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-950 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2', // minimum 44px for high touch accessibility!
    lg: 'text-base px-6 py-3.5 min-h-[52px] gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-cyber-cyan to-blue-600 text-dark-950 font-bold hover:shadow-glow-cyan hover:brightness-110 focus:ring-cyber-cyan/50',
    magenta:
      'bg-gradient-to-r from-cyber-magenta to-purple-600 text-white font-bold hover:shadow-glow-magenta hover:brightness-110 focus:ring-cyber-magenta/50',
    secondary:
      'bg-dark-800 text-slate-200 border border-slate-700/60 hover:bg-dark-700 hover:text-white focus:ring-slate-500/40',
    danger:
      'bg-gradient-to-r from-red-600 to-cyber-red text-white hover:shadow-glow-red hover:brightness-110 focus:ring-red-500/50',
    success:
      'bg-gradient-to-r from-emerald-500 to-cyber-green text-dark-950 font-bold hover:shadow-glow-green hover:brightness-110 focus:ring-cyber-green/50',
    outline:
      'border border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/10 focus:ring-cyber-cyan/40',
    ghost:
      'text-slate-300 hover:bg-white/5 hover:text-white focus:ring-slate-600',
  };

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
