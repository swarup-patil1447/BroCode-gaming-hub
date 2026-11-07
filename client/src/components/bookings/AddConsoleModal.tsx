import React, { useState, useMemo, useEffect } from 'react';
import { Booking, Station, PricingRule, DeviceType } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency, formatTime, getDeviceColor, getDeviceLabel } from '../../lib/utils';
import {
  Gamepad2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface AddConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess?: (updatedBooking: Booking) => void;
}

export const AddConsoleModal: React.FC<AddConsoleModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [controllerCount, setControllerCount] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && booking) {
      setControllerCount(Math.min(Math.max(booking.controllerCount || 1, 1), 4));
      setSelectedStationId(null);
      setFormError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, booking?.id]);

  // Fetch all stations
  const { data: stations = [], isLoading: isStationsLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.stations.getAll(),
    enabled: isOpen,
  });

  // Fetch all pricing rules
  const { data: pricingRules = [] } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => api.pricing.getAll(),
    enabled: isOpen,
  });

  // Compute remaining duration in minutes
  const remainingMinutes = useMemo(() => {
    if (!booking) return 0;
    const now = new Date();
    const end = new Date(booking.endTime);
    const start = new Date(booking.startTime);

    if (now >= end) return 0;

    if (booking.bookingStatus === 'ACTIVE' && now > start) {
      return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60)));
    }

    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
  }, [booking]);

  // Already assigned station IDs
  const assignedStationIds = useMemo(() => {
    if (!booking) return new Set<number>();
    return new Set(booking.stations.map((s) => s.stationId));
  }, [booking]);

  const bookingTableNumber = booking?.stations[0]?.station.tableNumber;

  // Only show unassigned consoles on this booking's table that are free for its remaining time.
  const candidateStations = useMemo(() => {
    if (!booking || bookingTableNumber === undefined) return [];

    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const effectiveStart = booking.bookingStatus === 'ACTIVE' && now > start ? now : start;

    return stations.filter((st) => {
      if (st.tableNumber !== bookingTableNumber || assignedStationIds.has(st.id)) return false;
      if (st.status === 'MAINTENANCE' || st.status === 'OCCUPIED') return false;
      if (st.isOccupied && st.currentBooking?.id !== booking.id) return false;

      const hasOverlappingReservation = (st.upcomingBookings || []).some((reservation) => {
        const reservedStart = new Date(reservation.startTime);
        const reservedEnd = new Date(reservation.endTime);
        return reservedStart < end && reservedEnd > effectiveStart;
      });

      return !hasOverlappingReservation;
    });
  }, [stations, assignedStationIds, booking, bookingTableNumber]);

  // Find currently selected candidate station
  const selectedStation = useMemo(() => {
    if (!selectedStationId) return null;
    return stations.find((st) => st.id === selectedStationId) || null;
  }, [stations, selectedStationId]);

  // Calculate pricing for selected station
  const pricingInfo = useMemo(() => {
    if (!selectedStation || remainingMinutes <= 0) return null;

    const norm = (selectedStation.deviceType || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
    const isSim = norm === 'CAR_SIMULATOR' || norm === 'SIMULATOR';
    const isConsole = norm === 'PS5' || norm === 'PS4';

    const rule = isConsole
      ? pricingRules.find(
          (r) =>
            r.deviceType === norm &&
            r.controllerCount === Math.min(Math.max(controllerCount, 1), 4)
        ) || pricingRules.find((r) => r.deviceType === norm && r.controllerCount === 1)
      : isSim
      ? pricingRules.find(
          (r) => r.deviceType === 'CAR_SIMULATOR' || r.deviceType === 'SIMULATOR'
        )
      : pricingRules.find((r) => r.deviceType === norm);

    const fallbackRate =
      norm === 'PS5'
        ? controllerCount === 2
          ? 140
          : controllerCount === 3
          ? 190
          : controllerCount === 4
          ? 240
          : 90
        : norm === 'PS4'
        ? controllerCount === 2
          ? 110
          : controllerCount === 3
          ? 150
          : controllerCount === 4
          ? 190
          : 70
        : 70;

    const baseRate = rule ? rule.hourlyRate : fallbackRate;
    const additionalCharge = isSim
      ? Math.round(baseRate * (remainingMinutes / 30))
      : Math.round((baseRate * remainingMinutes) / 60);

    return {
      baseRate,
      additionalCharge,
      unitLabel: isSim ? '30m' : 'hr',
      isSim,
      isConsole,
    };
  }, [selectedStation, controllerCount, pricingRules, remainingMinutes]);

  // Financial summary
  const financials = useMemo(() => {
    if (!booking) return null;
    const originalGrandTotal = booking.grandTotal;
    const additionalCharge = pricingInfo?.additionalCharge || 0;
    const updatedTotal = originalGrandTotal + additionalCharge;
    const totalPaid = (booking.payments || []).reduce((acc, p) => acc + p.amount, 0);
    const remainingBalance = Math.max(0, updatedTotal - totalPaid);

    return {
      originalGrandTotal,
      additionalCharge,
      updatedTotal,
      totalPaid,
      remainingBalance,
    };
  }, [booking, pricingInfo]);

  // Mutation to add console
  const addConsoleMutation = useMutation({
    mutationFn: async () => {
      if (!booking || !selectedStationId) {
        throw new Error('Please select a console to add.');
      }
      return api.bookings.addConsole(booking.id, {
        stationId: selectedStationId,
        controllerCount: selectedStation?.deviceType.includes('PS') ? controllerCount : 1,
      });
    },
    onSuccess: (updatedBooking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setSuccessMessage(
        `Successfully added Table ${selectedStation?.tableNumber} (${selectedStation?.deviceType}) to booking!`
      );
      setFormError(null);
      if (onSuccess) onSuccess(updatedBooking);
      setTimeout(() => {
        onClose();
      }, 1200);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to add console to booking.');
      setSuccessMessage(null);
    },
  });

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedStationId) {
      setFormError('Please select a console to add.');
      return;
    }

    if (remainingMinutes <= 0) {
      setFormError('Cannot add console: Session has already ended.');
      return;
    }

    addConsoleMutation.mutate();
  };

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Console to Booking"
      subtitle={`${booking.bookingCode} • ${booking.customerName}`}
      maxWidth="lg"
    >
      <form onSubmit={handleConfirm} className="space-y-5">
        {/* Success Banner */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-white text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-cyber-green shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Error Banner */}
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-white text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-cyber-red shrink-0" />
            <span className="font-semibold">{formError}</span>
          </div>
        )}

        {/* Booking Context Banner */}
        <div className="p-3.5 rounded-xl bg-dark-950/90 border border-slate-800 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div>
              <span className="text-slate-400">Customer: </span>
              <span className="font-bold text-white">{booking.customerName}</span>
              <span className="text-slate-500 font-mono ml-2">({booking.customerMobile})</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={booking.bookingStatus === 'ACTIVE' ? 'active' : 'available'}>
                {booking.bookingStatus}
              </Badge>
              <Badge variant={booking.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}>
                {booking.paymentStatus}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-400">Time: </span>
              <span className="text-slate-200">
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-cyber-cyan font-bold">
              <Clock className="h-3.5 w-3.5" />
              <span>Remaining: {remainingMinutes} mins</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-1">
            <span>Current Stations: </span>
            <span className="text-white font-mono font-semibold">
              {booking.stations.map((s) => `Table ${s.station.tableNumber} (${s.station.deviceType})`).join(', ')}
            </span>
          </div>
        </div>

        {/* Console Selection Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Select Available Console to Add</span>
            <span className="text-[11px] font-normal text-slate-400">
              Only charges for remaining {remainingMinutes}m
            </span>
          </label>

          {isStationsLoading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading gaming stations...</p>
          ) : candidateStations.length === 0 ? (
            <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 text-center text-xs text-slate-400">
              No additional consoles available on this table.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {candidateStations.map((st) => {
                const isSelected = selectedStationId === st.id;
                const isUnavailable = st.status === 'MAINTENANCE' || st.isOccupied;

                // Preview charge
                const norm = (st.deviceType || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
                const isSim = norm === 'CAR_SIMULATOR' || norm === 'SIMULATOR';
                const isConsole = norm === 'PS5' || norm === 'PS4';
                const rule = isConsole
                  ? pricingRules.find(
                      (r) => r.deviceType === norm && r.controllerCount === controllerCount
                    ) || pricingRules.find((r) => r.deviceType === norm && r.controllerCount === 1)
                  : isSim
                  ? pricingRules.find((r) => r.deviceType === 'CAR_SIMULATOR') ||
                    pricingRules.find((r) => r.deviceType === 'SIMULATOR')
                  : pricingRules.find((r) => r.deviceType === norm);
                const rate = rule
                  ? rule.hourlyRate
                  : norm === 'PS5'
                  ? controllerCount === 2 ? 140 : controllerCount === 3 ? 190 : controllerCount === 4 ? 240 : 90
                  : norm === 'PS4'
                  ? controllerCount === 2 ? 110 : controllerCount === 3 ? 150 : controllerCount === 4 ? 190 : 70
                  : 70;
                const estCharge = isSim
                  ? Math.round(rate * (remainingMinutes / 30))
                  : Math.round((rate * remainingMinutes) / 60);

                return (
                  <button
                    key={st.id}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => {
                      setSelectedStationId(st.id);
                      setFormError(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-glow-cyan/20'
                        : isUnavailable
                        ? 'bg-dark-950/40 border-slate-800/60 opacity-50 cursor-not-allowed'
                        : 'bg-dark-950 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display font-black text-sm text-white">
                        Table {st.tableNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDeviceColor(
                          st.deviceType
                        )}`}
                      >
                        {getDeviceLabel(st.deviceType)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono mt-2">
                      <span className="text-slate-400">
                        ₹{rate}/{isSim ? '30m' : 'hr'}
                      </span>
                      <span className="font-bold text-cyber-green">
                        +₹{estCharge} ({remainingMinutes}m)
                      </span>
                    </div>

                    {isUnavailable && (
                      <span className="text-[10px] text-cyber-red font-medium mt-1 block">
                        {st.status === 'MAINTENANCE' ? 'Under Maintenance' : 'Currently Occupied'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Controller Count Selector (if PS4/PS5 selected) */}
        {selectedStation && (selectedStation.deviceType === 'PS5' || selectedStation.deviceType === 'PS4') && (
          <div className="p-3 rounded-xl bg-dark-950 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Players for Table {selectedStation.tableNumber}</p>
              <p className="text-[11px] text-slate-400">Choose the player rate for this added console</p>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setControllerCount(cnt)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all ${
                    controllerCount === cnt
                      ? 'bg-cyber-cyan text-dark-950 font-black shadow-glow-cyan/20'
                      : 'bg-dark-850 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {cnt}P
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Financial Breakdown Summary Card */}
        {financials && selectedStation && pricingInfo && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 font-sans font-bold text-[11px] uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyber-cyan" />
                Updated Bill Summary
              </span>
              <span className="text-cyber-cyan">
                Table {selectedStation.tableNumber} ({selectedStation.deviceType}
                {pricingInfo.isConsole ? ` • ${controllerCount}P` : ''})
              </span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Original Booking Amount:</span>
              <span className="text-white font-bold">{formatCurrency(financials.originalGrandTotal)}</span>
            </div>

            <div className="flex justify-between text-emerald-400 font-bold">
              <span>
                + Table {selectedStation.tableNumber} ({remainingMinutes}m @ ₹{pricingInfo.baseRate}/
                {pricingInfo.unitLabel}):
              </span>
              <span>+{formatCurrency(financials.additionalCharge)}</span>
            </div>

            <div className="flex justify-between text-white font-black text-sm border-t border-slate-700 pt-2">
              <span>NEW TOTAL AMOUNT:</span>
              <span className="text-cyber-cyan">{formatCurrency(financials.updatedTotal)}</span>
            </div>

            <div className="flex justify-between text-slate-400 text-[11px] pt-1">
              <span>Paid Amount:</span>
              <span>{formatCurrency(financials.totalPaid)}</span>
            </div>

            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-300">Remaining Balance:</span>
              <span className={financials.remainingBalance > 0 ? 'text-cyber-magenta' : 'text-cyber-green'}>
                {formatCurrency(financials.remainingBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={addConsoleMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!selectedStationId || remainingMinutes <= 0 || addConsoleMutation.isPending}
            isLoading={addConsoleMutation.isPending}
            leftIcon={<PlusCircle className="h-4 w-4" />}
            className="font-bold px-5"
          >
            {pricingInfo
              ? `Confirm Add Console (+₹${pricingInfo.additionalCharge})`
              : 'Confirm Add Console'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
