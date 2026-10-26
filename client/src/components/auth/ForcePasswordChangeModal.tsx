import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ShieldAlert, Lock, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ForcePasswordChangeModal: React.FC = () => {
  const { user, updateUserSession } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!user || user.role !== 'OWNER' || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.user) {
        updateUserSession(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-dark-900 border border-cyber-magenta/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-cyber-magenta/20 border border-cyber-magenta/40 flex items-center justify-center text-cyber-magenta shadow-glow-magenta">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-wide">
            SECURITY REQUIRED
          </h2>
          <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-semibold leading-relaxed">
            Your account is using the initial password. For security, you must change your password before continuing.
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current Password *"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="New Password *"
            type="password"
            placeholder="••••••••"
            leftIcon={<KeyRound className="h-4 w-4" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password *"
            type="password"
            placeholder="••••••••"
            leftIcon={<KeyRound className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <p className="text-[11px] text-slate-400 bg-dark-950 p-3 rounded-xl border border-slate-800 leading-normal">
            Password must contain at least 8 characters, including uppercase, lowercase, and a number.
          </p>

          <Button
            type="submit"
            variant="magenta"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full font-display font-bold text-sm tracking-wider mt-2"
          >
            CHANGE PASSWORD TO CONTINUE
          </Button>
        </form>
      </div>
    </div>
  );
};
