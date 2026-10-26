import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { ShieldAlert, Lock, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const ForceChangePasswordModal: React.FC = () => {
  const { user, updateUserSession, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber) {
      setError('Password must contain at least 8 characters, including uppercase, lowercase, and a number.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.user && res.token) {
        updateUserSession(res.user, res.token);
      } else if (user) {
        updateUserSession({ ...user, mustChangePassword: false }, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please verify current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-md">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-dark-900 border border-cyber-magenta/40 shadow-glow-magenta/20 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-cyber-magenta/10 border border-cyber-magenta/30 text-cyber-magenta">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-display font-black text-white tracking-wide">
            INITIAL PASSWORD CHANGE
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your account is using the initial password. For security, you must change your password before continuing.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 text-cyber-red shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="Enter initial password (e.g. owner123)"
            leftIcon={<Lock className="h-4 w-4" />}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="New Secure Password"
            type="password"
            placeholder="Enter your new password"
            leftIcon={<Lock className="h-4 w-4 text-cyber-cyan" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            leftIcon={<CheckCircle2 className="h-4 w-4 text-cyber-green" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {/* Password Policy Card */}
          <div className="p-3 rounded-xl bg-dark-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300">Password Requirements:</div>
            <div className="flex items-center gap-1.5">
              <span className={newPassword.length >= 8 ? 'text-cyber-green font-bold' : 'text-slate-500'}>
                • Minimum 8 characters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-cyber-green font-bold' : 'text-slate-500'}>
                • Upper & lowercase letters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={/[0-9]/.test(newPassword) ? 'text-cyber-green font-bold' : 'text-slate-500'}>
                • At least 1 number
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Note: Changing your password will invalidate previous authentication sessions where supported.
          </p>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-glow-cyan/20"
              isLoading={isLoading}
            >
              SAVE PASSWORD & CONTINUE
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-slate-400 hover:text-white"
              onClick={logout}
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
            >
              Log Out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
