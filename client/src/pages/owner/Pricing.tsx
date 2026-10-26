import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PricingRule, DeviceType } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatCurrency, getDeviceColor, getDeviceLabel } from '../../lib/utils';
import { Tag, ShieldAlert, Edit2, CheckCircle2 } from 'lucide-react';

export const Pricing: React.FC = () => {
  const queryClient = useQueryClient();

  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [newRate, setNewRate] = useState<string>('');

  const { data: pricingRules = [], isLoading } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => api.pricing.getAll(),
  });

  const updatePriceMutation = useMutation({
    mutationFn: (data: { deviceType: string; controllerCount: number; hourlyRate: number }) =>
      api.pricing.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      setEditingRule(null);
    },
  });

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setNewRate(rule.hourlyRate.toString());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    updatePriceMutation.mutate({
      deviceType: editingRule.deviceType,
      controllerCount: editingRule.controllerCount,
      hourlyRate: parseFloat(newRate) || 0,
    });
  };

  const ps5Rules = pricingRules.filter((r) => r.deviceType === 'PS5');
  const ps4Rules = pricingRules.filter((r) => r.deviceType === 'PS4');
  const pcRule = pricingRules.find((r) => r.deviceType === 'PC');
  const simRule = pricingRules.find((r) => r.deviceType === 'CAR_SIMULATOR');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
          GAMING PRICING MANAGEMENT
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Owner-controlled hourly rates for PlayStation 5, PlayStation 4, PC, and Car Simulators
        </p>
      </div>

      {/* Historical Price Protection Info Banner (Requirement 17) */}
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
              <p className="text-[11px] text-slate-400 font-mono">Hourly simulator rate</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-base text-cyber-magenta">
                ₹{simRule?.hourlyRate || 100}/hr
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
                      hourlyRate: 100,
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
                ₹{pcRule?.hourlyRate || 70}/hr
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
        onClose={() => setEditingRule(null)}
        title="Update Hourly Rate"
        subtitle={`Editing rate for ${editingRule?.deviceType} (${editingRule?.controllerCount}P)`}
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Hourly Rate (₹) *"
            type="number"
            min="1"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            required
            autoFocus
          />

          <div className="p-3 rounded-xl bg-dark-950 text-[11px] text-slate-400">
            Past bookings will stay at their original booked rate. Only future bookings will apply this new rate.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditingRule(null)}>
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
