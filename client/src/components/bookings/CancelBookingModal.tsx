import React, { useState } from 'react';
import { Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('Customer requested cancellation');

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!booking) throw new Error('No booking selected');
      return api.bookings.cancel(booking.id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      onClose();
    },
  });

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Booking"
      subtitle={`Cancel booking ${booking.bookingCode}`}
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-cyber-red" />
          <span>
            Cancelling will release the reserved station(s) immediately while retaining this record for audit and reporting purposes.
          </span>
        </div>

        <Input
          label="Cancellation Reason"
          placeholder="e.g. Customer cancelled, No show"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Keep Booking
          </Button>
          <Button
            variant="danger"
            isLoading={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            CONFIRM CANCEL
          </Button>
        </div>
      </div>
    </Modal>
  );
};
