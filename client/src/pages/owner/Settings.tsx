import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Settings as SettingsIcon, MessageSquare, Shield, Smartphone, Globe, Lock, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatDate, formatTime } from '../../lib/utils';

export const Settings: React.FC = () => {
  const { updateUserSession } = useAuth();
  const [appName, setAppName] = useState('BroCode Gaming Cafe');
  const [shortName, setShortName] = useState('BroCode');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dev SMS Logs query
  const { data: smsLogs = [] } = useQuery({
    queryKey: ['dev-sms-logs'],
    queryFn: () => api.auth.getDevSMSLogs(),
    refetchInterval: 5000,
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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

      setSuccess('Owner password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (res.user) {
        updateUserSession(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update owner password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
          SYSTEM CONFIGURATION & SECURITY
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Owner account security parameters, brand configuration, and dev logs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECURITY CARD */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 md:col-span-2 shadow-xl">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyber-magenta" />
            <h3 className="font-display font-bold text-lg text-white">SECURITY</h3>
          </div>
          <p className="text-xs text-slate-400">
            Change your Owner account password.
          </p>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-cyber-green/60 text-cyber-green text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<KeyRound className="h-4 w-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<KeyRound className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="text-[11px] text-slate-400 space-y-1 bg-dark-950 p-3 rounded-xl border border-slate-800/80">
              <p className="text-cyber-cyan font-medium">
                Password must contain at least 8 characters, including uppercase, lowercase, and a number.
              </p>
              <p className="text-slate-500 italic">
                Changing your password will invalidate previous authentication sessions where supported.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                variant="magenta"
                isLoading={isLoading}
                disabled={isLoading}
                className="font-bold tracking-wide"
              >
                Change Password
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetForm}
                disabled={isLoading}
              >
                Reset
              </Button>
            </div>
          </form>
        </div>

        {/* Branding Configuration */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyber-cyan" />
            <h3 className="font-display font-bold text-lg text-white">Brand Display Settings</h3>
          </div>

          <div className="space-y-3">
            <Input
              label="Application Display Title"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />

            <Input
              label="Short Brand Name"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
            />

            <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-cyber-cyan">Brand Name: </span>
              BROCODE GAMING CAFE
            </div>
          </div>
        </div>

        {/* SMS / OTP Dispatch Logs (Dev Mode) */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyber-magenta" />
              <h3 className="font-display font-bold text-lg text-white">Dev SMS & OTP Logs</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-950 text-slate-400 border border-slate-800">
              Mock Provider Active
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Recent SMS dispatches (password reset OTPs, notifications). Real-time view for testing.
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {smsLogs.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-xs">No SMS dispatched yet.</p>
            ) : (
              smsLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-dark-950 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex justify-between font-mono text-[10px] text-slate-400">
                    <span className="text-cyber-cyan font-bold">{log.toMobile}</span>
                    <span>{formatTime(log.timestamp)}</span>
                  </div>
                  <p className="text-slate-200 font-sans">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
