import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PricingRule, DeviceType } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatCurrency, getDeviceColor, getDeviceLabel } from '../../lib/utils';
import { Tag, ShieldAlert, Edit2, CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';

export const Pricing: React.FC = () => {
  const queryClient = useQueryClient();

  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [newRate, setNewRate] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: pricingRules = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => api.pricing.getAll(),
  });

  const getRuleDisplayName = (deviceType: string, controllerCount: number) => {
    if (deviceType === 'CAR_SIMULATOR' || deviceType === 'SIMULATOR') {
      return 'Car Simulator (Tables 5 & 6) - per 30 mins';
    }
    if (deviceType === 'PC') {
      return 'Gaming PC Rig (Tables 7 & 8)';
    }
    if (deviceType === 'PS5') {
      return `PlayStation 5 (${controllerCount} Controller${controllerCount > 1 ? 's' : ''})`;
    }
    if (deviceType === 'PS4') {
      return `PlayStation 4 (${controllerCount} Controller${controllerCount > 1 ? 's' : ''})`;
    }
    return `${deviceType} (${controllerCount}P)`;
  };

  const updatePriceMutation = useMutation({
    mutationFn: (data: { deviceType: string; controllerCount: number; hourlyRate: number }) =>
      api.pricing.update(data),
    onSuccess: (savedRule, variables) => {
      // 1. Immediately update local cache for instant UI reflection (zero lag)
      queryClient.setQueryData<PricingRule[]>(['pricing'], (oldRules: PricingRule[] | undefined) => {
        const currentRules: PricingRule[] = oldRules ? [...oldRules] : [];
        const canonicalType =
          variables.deviceType === 'SIMULATOR' ? 'CAR_SIMULATOR' : variables.deviceType;
        const exists = currentRules.some(
          (r: PricingRule) =>
            (r.deviceType === canonicalType || (canonicalType === 'CAR_SIMULATOR' && r.deviceType === 'SIMULATOR')) &&
            r.controllerCount === variables.controllerCount
        );

        if (exists) {
          return currentRules.map((r: PricingRule) => {
            const matches =
              (r.deviceType === canonicalType ||
                (canonicalType === 'CAR_SIMULATOR' && r.deviceType === 'SIMULATOR')) &&
              r.controllerCount === variables.controllerCount;
            return matches ? { ...r, hourlyRate: variables.hourlyRate } : r;
          });
        }
        return [
          ...currentRules,
          {
            id: savedRule.id || `rule_${Date.now()}`,
            deviceType: canonicalType as DeviceType,
            controllerCount: variables.controllerCount,
            hourlyRate: variables.hourlyRate,
          },
        ];
      });

      // 2. Invalidate relevant queries so everything stays in sync
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      queryClient.invalidateQueries({ queryKey: ['stations'] });

      // 3. Display clear success message
      const displayName = getRuleDisplayName(variables.deviceType, variables.controllerCount);
      const isSim = variables.deviceType === 'CAR_SIMULATOR' || variables.deviceType === 'SIMULATOR';
      setSuccessMessage(`Successfully updated rate for ${displayName} to ₹${variables.hourlyRate}${isSim ? ' per 30 mins' : '/hr'}!`);
      setErrorMessage(null);
      setFormError(null);
      setEditingRule(null);

      // Auto-dismiss success message after 6 seconds
      setTimeout(() => {
        setSuccessMessage((prev) => (prev?.includes(displayName) ? null : prev));
      }, 6000);
    },
    onError: (err: any) => {
      const msg = err.message || 'Failed to update pricing on server';
      setFormError(msg);
      setErrorMessage(msg);
    },
  });

  const handleEdit = (rule: PricingRule) => {
    // Normalize simulator rule to CAR_SIMULATOR
    const isSim = rule.deviceType === 'CAR_SIMULATOR' || rule.deviceType === 'SIMULATOR';
    const normalizedRule: PricingRule = {
      ...rule,
      deviceType: isSim ? 'CAR_SIMULATOR' : rule.deviceType,
      controllerCount: isSim ? 1 : rule.controllerCount,
    };
    setEditingRule(normalizedRule);
    setNewRate(rule.hourlyRate.toString());
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    // Validate rate >= 0 and is a valid number
    if (newRate === '' || newRate === undefined || newRate === null) {
      setFormError('Please enter an hourly rate.');
      return;
    }

    const parsed = parseFloat(newRate);
    if (isNaN(parsed) || parsed < 0) {
      setFormError('Hourly rate must be a valid number greater than or equal to 0.');
      return;
    }

    setFormError(null);
    updatePriceMutation.mutate({
      deviceType: editingRule.deviceType,
      controllerCount: editingRule.controllerCount,
      hourlyRate: parsed,
    });
  };

  const ps5Rules = pricingRules.filter((r) => r.deviceType === 'PS5');
  const ps4Rules = pricingRules.filter((r) => r.deviceType === 'PS4');
  const pcRule = pricingRules.find((r) => r.deviceType === 'PC');
  const simRule = pricingRules.find(
    (r) => r.deviceType === 'CAR_SIMULATOR' || r.deviceType === 'SIMULATOR'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            GAMING PRICING MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Owner-controlled hourly rates for PlayStation 5, PlayStation 4, PC, and Car Simulators
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          isLoading={isRefetching}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />}
        >
          Refresh Prices
        </Button>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-white text-xs flex items-center justify-between gap-3 shadow-glow-green/20 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-cyber-green shrink-0" />
            <span className="font-semibold text-emerald-200">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-white text-xs flex items-center justify-between gap-3 shadow-glow-red/20 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-cyber-red shrink-0" />
            <span className="font-semibold text-rose-200">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Historical Price Protection Info Banner */}
      <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyber-cyan/40 text-xs text-slate-200 flex items-start gap-3 shadow-glow-cyan/10">
        <ShieldAlert className="h-5 w-5 text-cyber-cyan shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold text-cyber-cyan uppercase tracking-wider text-[11px]">
            Historical Price Protection Active
          </p>
          <p>
            When you update a gaming rate here, existing and historical bookings are safely protected. They retain the exact rate applied at the moment of booking without changing past revenue.
          </p>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PS5 Section */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display font-black text-lg text-cyber-cyan tracking-wider">
              PLAYSTATION 5 (TABLES 1 & 2)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-bold">
              PS5
            </span>
          </div>

          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((cnt) => {
              const rule = ps5Rules.find((r) => r.controllerCount === cnt) || {
                id: `ps5_${cnt}`,
                deviceType: 'PS5' as DeviceType,
                controllerCount: cnt,
                hourlyRate: cnt === 1 ? 90 : cnt === 2 ? 140 : cnt === 3 ? 190 : 240,
              };
              return (
                <div
                  key={cnt}
                  className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{cnt} Controller{cnt > 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Standard gaming rate</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-base text-cyber-cyan">
                      ₹{rule.hourlyRate}/hr
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(rule as PricingRule)}
                      leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PS4 Section */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display font-black text-lg text-cyber-purple tracking-wider">
              PLAYSTATION 4 (TABLES 3 & 4)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple font-bold">
              PS4
            </span>
          </div>

          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((cnt) => {
              const rule = ps4Rules.find((r) => r.controllerCount === cnt) || {
                id: `ps4_${cnt}`,
                deviceType: 'PS4' as DeviceType,
                controllerCount: cnt,
                hourlyRate: cnt === 1 ? 70 : cnt === 2 ? 110 : cnt === 3 ? 150 : 190,
              };
              return (
                <div
                  key={cnt}
                  className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{cnt} Controller{cnt > 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Standard gaming rate</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-base text-cyber-purple">
                      ₹{rule.hourlyRate}/hr
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(rule as PricingRule)}
                      leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CAR SIMULATOR Section */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display font-black text-lg text-cyber-magenta tracking-wider">
              CAR SIMULATOR (TABLES 5 & 6)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-magenta/10 border border-cyber-magenta/30 text-cyber-magenta font-bold">
              SIMULATOR
            </span>
          </div>

          <div className="p-4 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Full Cockpit & Wheel Setup</p>
              <p className="text-[11px] text-slate-400 font-mono">Simulator rate per 30 minutes</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-base text-cyber-magenta">
                ₹{simRule?.hourlyRate !== undefined ? simRule.hourlyRate : 80} / 30 min
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleEdit(
                    simRule || {
                      id: 'sim_1',
                      deviceType: 'CAR_SIMULATOR' as DeviceType,
                      controllerCount: 1,
                      hourlyRate: 80,
                    }
                  )
                }
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* PC Section */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display font-black text-lg text-cyber-green tracking-wider">
              GAMING PC (TABLES 7 & 8)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-green/10 border border-cyber-green/30 text-cyber-green font-bold">
              PC RIG
            </span>
          </div>

          <div className="p-4 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">High-Refresh Esports Rig</p>
              <p className="text-[11px] text-slate-400 font-mono">Hourly PC rate</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-base text-cyber-green">
                ₹{pcRule?.hourlyRate !== undefined ? pcRule.hourlyRate : 70}/hr
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleEdit(
                    pcRule || {
                      id: 'pc_1',
                      deviceType: 'PC' as DeviceType,
                      controllerCount: 1,
                      hourlyRate: 70,
                    }
                  )
                }
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Rate Modal */}
      <Modal
        isOpen={!!editingRule}
        onClose={() => {
          setEditingRule(null);
          setFormError(null);
        }}
        title={
          editingRule?.deviceType === 'CAR_SIMULATOR' || editingRule?.deviceType === 'SIMULATOR'
            ? 'Update Simulator Rate'
            : 'Update Hourly Rate'
        }
        subtitle={
          editingRule
            ? `Editing rate for ${getRuleDisplayName(editingRule.deviceType, editingRule.controllerCount)}`
            : 'Editing rate'
        }
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          <Input
            label={
              editingRule?.deviceType === 'CAR_SIMULATOR' || editingRule?.deviceType === 'SIMULATOR'
                ? 'Rate per 30 Minutes (₹) *'
                : 'Hourly Rate (₹) *'
            }
            type="number"
            min="0"
            step="1"
            value={newRate}
            onChange={(e) => {
              setNewRate(e.target.value);
              setFormError(null);
            }}
            required
            autoFocus
          />

          <div className="p-3 rounded-xl bg-dark-950 text-[11px] text-slate-400 leading-relaxed">
            {editingRule?.deviceType === 'CAR_SIMULATOR' || editingRule?.deviceType === 'SIMULATOR'
              ? 'Past bookings will stay at their original booked rate. Future bookings and real-time station estimates will apply this new 30-minute rate immediately.'
              : 'Past bookings will stay at their original booked rate. Future bookings and real-time station estimates will apply this new rate immediately.'}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingRule(null);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updatePriceMutation.isPending}
            >
              SAVE RATE
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

