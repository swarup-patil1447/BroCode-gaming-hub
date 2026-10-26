import React from 'react';
import { cn } from '../../lib/utils';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={cn('inline-block animate-spin rounded-full border-cyber-cyan border-t-transparent', sizeMap[size], className)} />
  );
};

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading BroCode System...' }) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <Spinner size="lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-cyber-cyan">BC</span>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-400 animate-pulse">{message}</p>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-dark-900 border border-slate-700/90 p-6 shadow-2xl z-10 space-y-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-300">{description}</p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-bold rounded-xl transition-all',
              variant === 'danger'
                ? 'bg-cyber-red text-white hover:brightness-110 shadow-glow-red'
                : 'bg-cyber-cyan text-dark-950 hover:brightness-110 shadow-glow-cyan'
            )}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-800 bg-dark-900/40">
      {icon && <div className="text-slate-500 mb-3">{icon}</div>}
      <h4 className="text-base font-bold text-slate-200">{title}</h4>
      {description && <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">{description}</p>}
      {action}
    </div>
  );
};
