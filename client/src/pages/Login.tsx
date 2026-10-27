import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ShieldCheck, User, Lock, KeyRound, AlertTriangle, CheckCircle2, Phone } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuth();

  const [selectedRole, setSelectedRole] = useState<Role>('EMPLOYEE');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password / OTP State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [otpTargetEmpId, setOtpTargetEmpId] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(role === 'OWNER' ? '/owner/dashboard' : '/employee/dashboard', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(employeeId, password, selectedRole);
      navigate(user.role === 'OWNER' ? '/owner/dashboard' : '/employee/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or access denied');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    try {
      const res = await api.auth.requestOTP(forgotIdentifier);
      setOtpTargetEmpId(res.employeeId);
      if (res.devOtp) setDevOtpHint(res.devOtp);
      setOtpSuccessMessage(`OTP sent to registered mobile (${res.mobileMasked})`);
      setOtpStep('verify');
    } catch (err: any) {
      setOtpError(err.message || 'Account not found');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (newPassword !== confirmPassword) {
      setOtpError('New passwords do not match');
      return;
    }

    try {
      await api.auth.verifyOTPAndResetPassword({
        employeeId: otpTargetEmpId,
        otp: otpCode,
        newPassword,
      });
      alert('Password reset successfully! You can now log in.');
      setIsForgotModalOpen(false);
      setOtpStep('request');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setDevOtpHint(null);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to verify OTP');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cyber Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyber-magenta/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-cyber-cyan via-cyber-magenta to-purple-600 p-[2px] shadow-glow-cyan">
            <div className="h-full w-full bg-dark-950 rounded-[14px] flex items-center justify-center">
              <span className="font-display font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan to-cyber-magenta">
                BC
              </span>
            </div>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-wider">
            BROCODE
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Gaming Cafe Management
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-800 bg-dark-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Role Toggle (Requirement 6) */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-dark-950 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('OWNER');
                setError(null);
              }}
              className={`py-2.5 rounded-xl font-display font-bold text-sm tracking-wider transition-all ${
                selectedRole === 'OWNER'
                  ? 'bg-gradient-to-r from-cyber-magenta to-purple-600 text-white shadow-glow-magenta'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OWNER
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('EMPLOYEE');
                setError(null);
              }}
              className={`py-2.5 rounded-xl font-display font-bold text-sm tracking-wider transition-all ${
                selectedRole === 'EMPLOYEE'
                  ? 'bg-gradient-to-r from-cyber-cyan to-blue-600 text-dark-950 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EMPLOYEE
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={selectedRole === 'OWNER' ? 'Username / Employee ID' : 'Employee ID / Mobile'}
              placeholder={selectedRole === 'OWNER' ? 'e.g. owner' : 'e.g. EMP001'}
              leftIcon={<User className="h-4 w-4" />}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-mono text-[11px]">
                Demo: {selectedRole === 'OWNER' ? 'owner / OwnerPass2026!' : 'EMP001 / emp123'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(true);
                  setOtpError(null);
                  setOtpStep('request');
                }}
                className="text-cyber-cyan hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              variant={selectedRole === 'OWNER' ? 'magenta' : 'primary'}
              size="lg"
              isLoading={isLoading}
              className="w-full font-display font-black text-base tracking-wider mt-2"
            >
              LOGIN TO BROCODE
            </Button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-500">
          BroCode Gaming Cafe • Authorized Staff Access Only
        </p>
      </div>

      {/* Forgot Password OTP Modal (Requirement 8) */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Employee Password Recovery"
        subtitle="Recover account access via 6-digit OTP verification"
        maxWidth="md"
      >
        {otpStep === 'request' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            {otpError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs">
                {otpError}
              </div>
            )}

            <Input
              label="Employee ID or Registered Mobile"
              placeholder="e.g. EMP001 or +919000000001"
              leftIcon={<Phone className="h-4 w-4" />}
              value={forgotIdentifier}
              onChange={(e) => setForgotIdentifier(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsForgotModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                SEND 6-DIGIT OTP
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {otpSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-cyber-green/60 text-cyber-green text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{otpSuccessMessage}</span>
              </div>
            )}

            {devOtpHint && (
              <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyber-cyan/60 text-cyber-cyan text-xs">
                <span className="font-bold">Dev Mode OTP: </span>
                <span className="font-mono text-sm tracking-widest">{devOtpHint}</span>
              </div>
            )}

            {otpError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs">
                {otpError}
              </div>
            )}

            <Input
              label="Enter 6-Digit OTP"
              placeholder="123456"
              maxLength={6}
              leftIcon={<KeyRound className="h-4 w-4" />}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 6 characters"
              leftIcon={<Lock className="h-4 w-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOtpStep('request')}>
                Back
              </Button>
              <Button type="submit" variant="magenta">
                CHANGE PASSWORD
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
