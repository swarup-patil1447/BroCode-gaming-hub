import React, { useEffect, useState } from 'react';
import { Station } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  formatCurrency,
  formatTime,
  formatCountdown,
  getDeviceColor,
  getDeviceLabel,
} from '../../lib/utils';
import {
  Gamepad2,
  Clock,
  User,
  UtensilsCrossed,
  CreditCard,
  Eye,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';

interface StationCardProps {
  station: Station;
  onBook: (stationId: number) => void;
  onViewBooking: (bookingId: string) => void;
  onAddFood: (bookingId: string) => void;
  onPay: (bookingId: string) => void;
  onExtend: (bookingId: string) => void;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onBook,
  onViewBooking,
  onAddFood,
  onPay,
  onExtend,
}) => {
  const [remainingSec, setRemainingSec] = useState<number>(station.remainingSeconds || 0);

  // Live countdown timer synced with server remaining seconds
  useEffect(() => {
    setRemainingSec(station.remainingSeconds || 0);
    if (!station.isOccupied || (station.remainingSeconds || 0) <= 0) return;

    const interval = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [station.remainingSeconds, station.isOccupied]);

  const isOccupied = station.isOccupied && station.currentBooking;
  const isAvailable = !isOccupied && station.status !== 'MAINTENANCE';
  const isMaintenance = station.status === 'MAINTENANCE';

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 ${
        isOccupied
          ? 'glass-card-booked shadow-glow-red/10'
          : isMaintenance
          ? 'bg-amber-950/30 border-amber-500/30'
          : 'glass-card-available shadow-glow-green/10'
      }`}
    >
      {/* Card Header: Table Number & Device Type */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-xl text-white tracking-wide">
              TABLE {station.tableNumber}
            </span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getDeviceColor(
              station.deviceType
            )}`}
          >
            {getDeviceLabel(station.deviceType)}
          </span>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          {isOccupied ? (
            <Badge variant="booked" dot>
              🔴 BOOKED
            </Badge>
          ) : isMaintenance ? (
            <Badge variant="maintenance" dot>
              ⚠️ MAINTENANCE
            </Badge>
          ) : (
            <Badge variant="available" dot>
              🟢 AVAILABLE
            </Badge>
          )}
        </div>

        {/* Occupied Details or Availability Details */}
        {isOccupied && station.currentBooking ? (
          <div className="space-y-3">
            {/* Customer & Time Info */}
            <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <User className="h-3.5 w-3.5 text-cyber-cyan" />
                  <span className="truncate max-w-[120px]">{station.currentBooking.customerName}</span>
                </div>
                <Badge
                  variant={station.currentBooking.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}
                  className="text-[10px] py-0 px-1.5"
                >
                  {station.currentBooking.paymentStatus}
                </Badge>
              </div>

              <div className="text-xs text-slate-300 flex items-center justify-between font-mono pt-1 border-t border-slate-800/80">
                <span>
                  {formatTime(station.currentBooking.startTime)} - {formatTime(station.currentBooking.endTime)}
                </span>
              </div>
            </div>

            {/* Next Free Availability (Critical Requirement 11) */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-slate-400">Free at:</span>
              <span className="font-bold text-cyber-cyan font-mono">
                {station.nextAvailableTime || formatTime(station.currentBooking.endTime)}
              </span>
            </div>

            {/* Live Remaining Countdown Timer */}
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-300 text-xs font-semibold">
                <Clock className="h-4 w-4 text-cyber-red animate-pulse" />
                <span>Remaining:</span>
              </div>
              <span className="font-mono font-black text-sm text-cyber-red tracking-wider">
                {remainingSec > 0 ? formatCountdown(remainingSec) : '00:00:00 (ENDED)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-2 text-center sm:text-left">
            <p className="text-sm font-semibold text-cyber-green flex items-center justify-center sm:justify-start gap-1.5">
              <span>Available Now</span>
            </p>
            {station.availableUntil ? (
              <p className="text-xs text-slate-400">
                Available until <span className="font-bold text-slate-200">{station.availableUntil}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400">Ready for new booking</p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-5 pt-3 border-t border-slate-800/80">
        {isOccupied && station.currentBooking ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onViewBooking(station.currentBooking!.id)}
              leftIcon={<Eye className="h-3.5 w-3.5" />}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAddFood(station.currentBooking!.id)}
              leftIcon={<UtensilsCrossed className="h-3.5 w-3.5 text-cyber-amber" />}
            >
              Food
            </Button>
            <Button
              size="sm"
              variant={station.currentBooking.paymentStatus === 'PAID' ? 'secondary' : 'magenta'}
              onClick={() => onPay(station.currentBooking!.id)}
              leftIcon={<CreditCard className="h-3.5 w-3.5" />}
            >
              Pay
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExtend(station.currentBooking!.id)}
              leftIcon={<Clock className="h-3.5 w-3.5" />}
            >
              Extend
            </Button>
          </div>
        ) : (
          <Button
            size="md"
            variant="success"
            className="w-full text-sm font-bold"
            disabled={isMaintenance}
            onClick={() => onBook(station.id)}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            {isMaintenance ? 'Under Maintenance' : 'BOOK STATION'}
          </Button>
        )}
      </div>
    </div>
  );
};
