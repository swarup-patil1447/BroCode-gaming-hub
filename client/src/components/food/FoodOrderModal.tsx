import React, { useState } from 'react';
import { Booking, FoodItem } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Plus, Minus, UtensilsCrossed } from 'lucide-react';

interface FoodOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const FoodOrderModal: React.FC<FoodOrderModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: foodCatalog = [] } = useQuery({
    queryKey: ['food'],
    queryFn: () => api.food.getAll(),
    enabled: isOpen,
  });

  const addFoodMutation = useMutation({
    mutationFn: () => {
      if (!booking) throw new Error('No booking selected');
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([foodItemId, quantity]) => ({ foodItemId, quantity }));

      return api.bookings.addFood(booking.id, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setQuantities({});
      onClose();
    },
  });

  if (!booking) return null;

  const totalAddedAmount = Object.entries(quantities).reduce((acc, [foodId, qty]) => {
    const item = foodCatalog.find((f) => f.id === foodId);
    return acc + (item ? item.price * qty : 0);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Food & Drinks to Session"
      subtitle={`Adding to ${booking.customerName} (${booking.bookingCode})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Available Food Catalog */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {foodCatalog
            .filter((f) => f.isAvailable)
            .map((item) => {
              const qty = quantities[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    qty > 0
                      ? 'bg-amber-950/20 border-cyber-amber/40 shadow-sm'
                      : 'bg-dark-950/60 border-slate-800'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="text-xs font-mono text-slate-400">
                      ₹{item.price} • <span className="text-[10px] uppercase">{item.category}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                        }))
                      }
                      className="h-8 w-8 rounded-xl bg-dark-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-mono font-bold text-sm w-4 text-center text-white">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: (prev[item.id] || 0) + 1,
                        }))
                      }
                      className="h-8 w-8 rounded-xl bg-dark-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Total Summary */}
        <div className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between text-sm">
          <span className="text-slate-400">Food Total to Add:</span>
          <span className="font-mono font-bold text-cyber-amber text-base">
            +{formatCurrency(totalAddedAmount)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={totalAddedAmount <= 0}
            isLoading={addFoodMutation.isPending}
            onClick={() => addFoodMutation.mutate()}
            leftIcon={<UtensilsCrossed className="h-4 w-4" />}
          >
            ADD TO BILL ({formatCurrency(totalAddedAmount)})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
