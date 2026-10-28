import React, { useState, useEffect } from 'react';
import { Station, FoodItem, PricingRule } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency, formatTime, getDeviceColor, getDeviceLabel } from '../../lib/utils';
import { Gamepad2, Clock, Plus, Minus, UtensilsCrossed, AlertTriangle, Check } from 'lucide-react';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedStationId?: number | null;
  onSuccess?: (bookingId: string) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  preSelectedStationId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [selectedStationIds, setSelectedStationIds] = useState<number[]>([]);
  const [controllerCount, setControllerCount] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedFood, setSelectedFood] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Time state defaults to current time rounded to nearest 5 mins
  const [startDateTime, setStartDateTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  // Fetch stations, pricing, and food
  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.stations.getAll(),
    enabled: isOpen,
  });

  const { data: pricingRules = [] } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => api.pricing.getAll(),
    enabled: isOpen,
  });

  const { data: foodCatalog = [] } = useQuery({
    queryKey: ['food'],
    queryFn: () => api.food.getAll(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      if (preSelectedStationId) {
        setSelectedStationIds([preSelectedStationId]);
      } else if (selectedStationIds.length === 0 && stations.length > 0) {
        const firstAvail = stations.find((s) => !s.isOccupied && s.status !== 'MAINTENANCE');
        if (firstAvail) setSelectedStationIds([firstAvail.id]);
      }
      setConflictError(null);
    }
  }, [isOpen, preSelectedStationId, stations]);

  // Calculate End Time
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  // Toggle station selection for multi-station booking
  const toggleStation = (id: number) => {
    setSelectedStationIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
    setConflictError(null);
  };

  // Calculate live gaming rate per station
  const calculateStationRate = (station: Station) => {
    const isConsole = station.deviceType === 'PS5' || station.deviceType === 'PS4';
    const isSim = station.deviceType === 'CAR_SIMULATOR' || station.deviceType === 'SIMULATOR';

    const rule = isConsole
      ? pricingRules.find(
          (r) => r.deviceType === station.deviceType && r.controllerCount === controllerCount
        ) || pricingRules.find((r) => r.deviceType === station.deviceType && r.controllerCount === 1)
      : isSim
      ? pricingRules.find((r) => r.deviceType === 'CAR_SIMULATOR') ||
        pricingRules.find((r) => r.deviceType === 'SIMULATOR')
      : pricingRules.find((r) => r.deviceType === station.deviceType);

    const fallbackRate =
      station.deviceType === 'PS5'
        ? controllerCount === 2
          ? 140
          : 90
        : station.deviceType === 'PS4'
        ? controllerCount === 2
          ? 110
          : 70
        : isSim
        ? 100
        : 70;

    const hourlyRate = rule ? rule.hourlyRate : fallbackRate;
    const durationHours = durationMinutes / 60;
    return {
      hourlyRate,
      total: hourlyRate * durationHours,
    };
  };

  const selectedStations = stations.filter((s) => selectedStationIds.includes(s.id));
  const hasConsole = selectedStations.some(
    (s) => s.deviceType === 'PS5' || s.deviceType === 'PS4'
  );

  let totalGaming = 0;
  const stationBreakdowns = selectedStations.map((st) => {
    const rateInfo = calculateStationRate(st);
    totalGaming += rateInfo.total;
    return {
      tableNumber: st.tableNumber,
      deviceType: st.deviceType,
      hourlyRate: rateInfo.hourlyRate,
      total: rateInfo.total,
    };
  });

  // Food totals
  let totalFood = 0;
  const foodBreakdowns: Array<{ id: string; name: string; qty: number; unitPrice: number; total: number }> = [];
  Object.entries(selectedFood).forEach(([foodId, qty]) => {
    if (qty > 0) {
      const item = foodCatalog.find((f) => f.id === foodId);
      if (item) {
        const lineTotal = item.price * qty;
        totalFood += lineTotal;
        foodBreakdowns.push({
          id: item.id,
          name: item.name,
          qty,
          unitPrice: item.price,
          total: lineTotal,
        });
      }
    }
  });

  const grandTotal = Math.max(0, totalGaming + totalFood - Number(discount || 0));

  const createBookingMutation = useMutation({
    mutationFn: () => {
      const foodPayload = Object.entries(selectedFood)
        .filter(([_, qty]) => qty > 0)
        .map(([foodItemId, quantity]) => ({ foodItemId, quantity }));

      return api.bookings.create({
        customerName,
        customerMobile,
        stationIds: selectedStationIds,
        controllerCount: hasConsole ? controllerCount : 1,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        foodItems: foodPayload,
        discount: Number(discount) || 0,
        notes,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      onClose();
      if (onSuccess) onSuccess(data.id);
    },
    onError: (err: any) => {
      setConflictError(err.message || 'Failed to create booking');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerMobile.trim()) {
      setConflictError('Please enter Customer Name and Mobile number');
      return;
    }
    if (selectedStationIds.length === 0) {
      setConflictError('Please select at least one gaming station');
      return;
    }
    createBookingMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Gaming Booking"
      subtitle="Select table(s), controller options, duration, and food items"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Conflict or Validation Error Banner */}
        {conflictError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{conflictError}</span>
          </div>
        )}

        {/* Customer Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Customer Name *"
            placeholder="e.g. Rahul"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <Input
            label="Customer Mobile *"
            placeholder="e.g. 9876543210"
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            required
          />
        </div>

        {/* Gaming Stations Multi-Selection Grid (Requirement 13 & 14) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Gaming Station(s) *
            </label>
            <span className="text-[11px] text-cyber-cyan font-mono">
              {selectedStationIds.length} station(s) selected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {stations.map((st) => {
              const isSelected = selectedStationIds.includes(st.id);
              return (
                <div
                  key={st.id}
                  onClick={() => toggleStation(st.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-glow-cyan/20'
                      : st.isOccupied
                      ? 'bg-dark-950/70 border-slate-800 opacity-80'
                      : 'bg-dark-900 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-white">
                      Table {st.tableNumber}
                    </span>
                    <div
                      className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-cyber-cyan border-cyber-cyan text-dark-950' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    {getDeviceLabel(st.deviceType)}
                  </p>

                  <div className="mt-2 text-[10px]">
                    {st.isOccupied ? (
                      <span className="text-cyber-red font-medium">
                        Busy • Free at {st.nextAvailableTime || 'soon'}
                      </span>
                    ) : (
                      <span className="text-cyber-green font-medium">Available Now</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controller Count Selection for Consoles (Requirement 15) */}
        {hasConsole && (
          <div className="p-4 rounded-xl bg-dark-950/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white">
                  PS5 / PS4 Controllers
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hourly rate scales dynamically based on controller count
                </p>
              </div>

              <div className="flex items-center gap-3">
                {[1, 2, 3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setControllerCount(cnt)}
                    className={`h-9 w-9 rounded-xl font-display font-extrabold text-sm transition-all ${
                      controllerCount === cnt
                        ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/40 scale-105'
                        : 'bg-dark-850 text-slate-300 border border-slate-700 hover:text-white'
                    }`}
                  >
                    {cnt}P
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Date, Time & Duration Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date & Time *"
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Duration
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[30, 60, 90, 120, 180].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                    durationMinutes === mins
                      ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/30'
                      : 'bg-dark-850 text-slate-300 border border-slate-700 hover:bg-dark-800'
                  }`}
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
              Session End: <span className="font-bold text-slate-200">{formatTime(endDate)}</span>
            </p>
          </div>
        </div>

        {/* Food & Snacks Section */}
        {foodCatalog.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-cyber-amber" />
                Add Food & Drinks
              </label>
              {totalFood > 0 && (
                <span className="text-xs font-bold text-cyber-amber font-mono">
                  Food: {formatCurrency(totalFood)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {foodCatalog
                .filter((f) => f.isAvailable)
                .map((f) => {
                  const qty = selectedFood[f.id] || 0;
                  return (
                    <div
                      key={f.id}
                      className={`p-2.5 rounded-xl border ${
                        qty > 0
                          ? 'bg-amber-950/20 border-cyber-amber/40 shadow-sm'
                          : 'bg-dark-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[100px]">
                          {f.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">₹{f.price}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFood((prev) => ({
                              ...prev,
                              [f.id]: Math.max(0, (prev[f.id] || 0) - 1),
                            }))
                          }
                          className="h-6 w-6 rounded-lg bg-dark-800 text-slate-300 hover:text-white flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold font-mono text-white">{qty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFood((prev) => ({
                              ...prev,
                              [f.id]: (prev[f.id] || 0) + 1,
                            }))
                          }
                          className="h-6 w-6 rounded-lg bg-dark-800 text-slate-300 hover:text-white flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Live Calculation Summary Card */}
        <div className="p-4 rounded-2xl bg-dark-950/90 border border-slate-800 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Booking Bill Summary
          </p>

          <div className="space-y-1 text-xs text-slate-300">
            {stationBreakdowns.map((sb) => (
              <div key={sb.tableNumber} className="flex items-center justify-between">
                <span>
                  Table {sb.tableNumber} ({sb.deviceType}
                  {sb.deviceType.includes('PS') ? ` • ${controllerCount}P` : ''}) - {durationMinutes / 60}h @ ₹{sb.hourlyRate}/hr
                </span>
                <span className="font-mono text-white">₹{sb.total}</span>
              </div>
            ))}

            {foodBreakdowns.map((fb) => (
              <div key={fb.id} className="flex items-center justify-between text-cyber-amber">
                <span>
                  {fb.name} × {fb.qty} (@ ₹{fb.unitPrice})
                </span>
                <span className="font-mono">₹{fb.total}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-base font-bold">
            <span className="text-white">GRAND TOTAL</span>
            <span className="font-mono text-xl text-cyber-cyan font-display font-black">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={createBookingMutation.isPending}
            className="px-8 font-extrabold"
          >
            CONFIRM & BOOK
          </Button>
        </div>
      </form>
    </Modal>
  );
};
