import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { User, Lock, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, role, updateUserSession } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password confirmation does not match');
      return;
    }

    setIsLoading(true);
    try {
      const res =
        role === 'OWNER'
          ? await api.auth.changePassword({ currentPassword, newPassword, confirmPassword })
          : await api.auth.employeeChangePassword({ currentPassword, newPassword, confirmPassword });

      if (res.user) {
        updateUserSession(res.user, res.token);
      } else if (res.token && user) {
        updateUserSession(user, res.token);
      }

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
          MY ACCOUNT PROFILE
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          View account credentials and update your security password
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">
            <User className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{user?.name}</h2>
              <Badge variant={role === 'OWNER' ? 'magenta' : 'cyan'}>{role}</Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Employee ID: <span className="text-white font-bold">{user?.employeeId}</span>
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Mobile: {user?.mobile}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-cyber-cyan" />
          <h3 className="font-display font-bold text-lg text-white">Change Password</h3>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-cyber-green/60 text-cyber-green text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
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
            placeholder="Minimum 6 characters"
            leftIcon={<Lock className="h-4 w-4" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password *"
            type="password"
            placeholder="Re-enter new password"
            leftIcon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full font-bold"
          >
            UPDATE PASSWORD
          </Button>
        </form>
      </div>
    </div>
  );
};
