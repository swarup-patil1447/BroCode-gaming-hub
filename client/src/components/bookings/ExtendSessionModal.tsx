import React, { useState } from 'react';
import { Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency, formatTime } from '../../lib/utils';
import { Clock, AlertTriangle, Check } from 'lucide-react';

interface ExtendSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const ExtendSessionModal: React.FC<ExtendSessionModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const queryClient = useQueryClient();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>('45');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const minsToExtend = isCustom ? parseInt(customMinutes, 10) || 0 : selectedMinutes;

  const extendMutation = useMutation({
    mutationFn: () => {
      if (!booking) throw new Error('No active booking selected');
      return api.bookings.extend(booking.id, minsToExtend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to extend session');
    },
  });

  if (!booking) return null;

  const currentEnd = new Date(booking.endTime);
  const newEnd = new Date(currentEnd.getTime() + minsToExtend * 60 * 1000);

  // Calculate estimated additional charge using historical applied rates
  const additionalHours = minsToExtend / 60;
  const additionalAmount = booking.stations.reduce(
    (acc, st) => acc + st.appliedRatePerHour * additionalHours,
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extend Gaming Session"
      subtitle={`Extend session for ${booking.customerName} (${booking.bookingCode})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Current Times */}
        <div className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <p className="text-slate-400">Current End Time</p>
            <p className="font-bold text-white font-mono text-sm mt-0.5">
              {formatTime(booking.endTime)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">New End Time</p>
            <p className="font-bold text-cyber-cyan font-mono text-sm mt-0.5">
              {formatTime(newEnd)}
            </p>
          </div>
        </div>

        {/* Quick Options */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Choose Extension
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setIsCustom(false);
                  setSelectedMinutes(m);
                  setErrorMessage(null);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  !isCustom && selectedMinutes === m
                    ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/40 scale-105'
                    : 'bg-dark-850 text-slate-300 border border-slate-700 hover:text-white'
                }`}
              >
                +{m} mins
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setIsCustom(true);
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                isCustom
                  ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/40 scale-105'
                  : 'bg-dark-850 text-slate-300 border border-slate-700 hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          {isCustom && (
            <div className="mt-3">
              <Input
                label="Custom Minutes"
                type="number"
                min="5"
                max="300"
                step="5"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Additional Bill Preview */}
        <div className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between text-sm">
          <span className="text-slate-400">Additional Charge:</span>
          <span className="font-mono font-bold text-cyber-cyan">
            +{formatCurrency(additionalAmount)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={extendMutation.isPending}
            onClick={() => extendMutation.mutate()}
            leftIcon={<Clock className="h-4 w-4" />}
          >
            CONFIRM EXTENSION
          </Button>
        </div>
      </div>
    </Modal>
  );
};
