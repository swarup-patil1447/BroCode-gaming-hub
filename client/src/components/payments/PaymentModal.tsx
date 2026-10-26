import React, { useState } from 'react';
import { Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { CreditCard, Banknote, QrCode, Layers, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'OTHER'>('UPI');
  const [amount, setAmount] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  React.useEffect(() => {
    if (booking) {
      const alreadyPaid = (booking.payments || []).reduce((acc, p) => acc + p.amount, 0);
      const remaining = Math.max(0, booking.grandTotal - alreadyPaid);
      setAmount(remaining.toString());
      setIsSuccess(false);
    }
  }, [booking]);

  const payMutation = useMutation({
    mutationFn: () => {
      if (!booking) throw new Error('No booking selected');
      return api.payments.record({
        bookingId: booking.id,
        amount: parseFloat(amount) || 0,
        paymentMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    },
  });

  if (!booking) return null;

  const paymentMethods = [
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'CARD', label: 'Card / POS', icon: CreditCard },
    { id: 'OTHER', label: 'Other', icon: Layers },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settle Bill & Record Payment"
      subtitle={`Booking ${booking.bookingCode} - ${booking.customerName}`}
      maxWidth="md"
    >
      {isSuccess ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-950/80 border-2 border-cyber-green flex items-center justify-center text-cyber-green animate-bounce shadow-glow-green">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold text-white">Payment Received!</h3>
          <p className="text-xs text-slate-300">
            ₹{amount} via {paymentMethod} marked as paid. Owner notified.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bill Breakdown */}
          <div className="p-4 rounded-2xl bg-dark-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Gaming Charges:</span>
              <span className="font-mono text-white font-bold">{formatCurrency(booking.gamingAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Food & Drinks:</span>
              <span className="font-mono text-white font-bold">{formatCurrency(booking.foodAmount)}</span>
            </div>
            {booking.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono">-₹{booking.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-800 pt-2">
              <span>TOTAL DUE:</span>
              <span className="font-mono text-cyber-cyan text-lg">
                {formatCurrency(booking.grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {paymentMethods.map((m) => {
                const isSelected = paymentMethod === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-glow-cyan/20'
                        : 'bg-dark-850 border-slate-700/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Paid Input */}
          <Input
            label="Amount Paid (₹) *"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="magenta"
              size="lg"
              isLoading={payMutation.isPending}
              onClick={() => payMutation.mutate()}
              className="px-8 font-black"
            >
              MARK AS PAID (₹{amount})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
