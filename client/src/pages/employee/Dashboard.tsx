import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { StationGrid } from '../../components/stations/StationGrid';
import { NewBookingModal } from '../../components/bookings/NewBookingModal';
import { ExtendSessionModal } from '../../components/bookings/ExtendSessionModal';
import { PaymentModal } from '../../components/payments/PaymentModal';
import { FoodOrderModal } from '../../components/food/FoodOrderModal';
import { ReceiptModal } from '../../components/bookings/ReceiptModal';
import { Booking } from '../../types';
import { formatCurrency, formatTime, formatCountdown } from '../../lib/utils';
import {
  Gamepad2,
  PlusCircle,
  UtensilsCrossed,
  CalendarDays,
  Clock,
  CreditCard,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedStationForBook, setSelectedStationForBook] = useState<number | null>(null);

  const [activeBookingForModal, setActiveBookingForModal] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<'view' | 'food' | 'pay' | 'extend' | 'receipt' | null>(null);

  // Fetch Stations
  const { data: stations = [], isLoading: isStationsLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.stations.getAll(),
    refetchInterval: 5000,
  });

  // Fetch Today's Upcoming Bookings
  const { data: todayBookings = [] } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: () => api.bookings.getAll({ date: 'today', limit: 10 }),
    refetchInterval: 10000,
  });

  const handleAction = async (bookingId: string, type: 'view' | 'food' | 'pay' | 'extend' | 'receipt') => {
    try {
      const b = await api.bookings.getById(bookingId);
      setActiveBookingForModal(b);
      setModalType(type);
    } catch (err) {
      console.error('Failed to load booking:', err);
    }
  };

  const occupiedCount = stations.filter((s) => s.isOccupied).length;
  const availableCount = Math.max(0, stations.length - occupiedCount);

  return (
    <div className="space-y-6">
      {/* Employee Quick Action Bar (Requirement 12) */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-black text-white tracking-wide">
              OPERATIONS DESK
            </h1>
            <p className="text-xs text-slate-400">
              {availableCount} Available • {occupiedCount} Occupied tables
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="md"
            variant="primary"
            onClick={() => {
              setSelectedStationForBook(null);
              setIsNewBookingOpen(true);
            }}
            leftIcon={<PlusCircle className="h-4 w-4" />}
            className="font-black px-5"
          >
            NEW BOOKING
          </Button>

          <Button
            size="md"
            variant="secondary"
            onClick={() => navigate('/employee/food')}
            leftIcon={<UtensilsCrossed className="h-4 w-4 text-cyber-amber" />}
          >
            FOOD MENU
          </Button>

          <Button
            size="md"
            variant="secondary"
            onClick={() => navigate('/employee/bookings')}
            leftIcon={<CalendarDays className="h-4 w-4 text-cyber-cyan" />}
          >
            ALL BOOKINGS
          </Button>
        </div>
      </div>

      {/* 8 Gaming Stations Live Grid (Requirement 10) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-white tracking-wide flex items-center gap-2">
            <span>8 GAMING TABLES</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Real-time status</span>
        </div>

        <StationGrid
          stations={stations}
          isLoading={isStationsLoading}
          onBook={(stId) => {
            setSelectedStationForBook(stId);
            setIsNewBookingOpen(true);
          }}
          onViewBooking={(bId) => handleAction(bId, 'view')}
          onAddFood={(bId) => handleAction(bId, 'food')}
          onPay={(bId) => handleAction(bId, 'pay')}
          onExtend={(bId) => handleAction(bId, 'extend')}
        />
      </div>

      {/* Active & Upcoming Queue */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-white">Active & Today's Schedule</h3>
          <span className="text-xs text-slate-400 font-mono">{todayBookings.length} sessions</span>
        </div>

        {todayBookings.length === 0 ? (
          <p className="text-center py-6 text-slate-500 text-xs">No active sessions or bookings today.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayBookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">{b.bookingCode}</span>
                    <Badge
                      variant={b.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}
                      className="text-[9px] py-0 px-1"
                    >
                      {b.paymentStatus}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mt-1">
                    {b.customerName} ({b.customerMobile})
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {b.stations.map((s) => `Table ${s.station.tableNumber}`).join(', ')} • {formatTime(b.startTime)} - {formatTime(b.endTime)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-mono font-bold text-cyber-cyan text-sm">
                    {formatCurrency(b.grandTotal)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAction(b.id, 'receipt')}
                    >
                      Receipt
                    </Button>
                    {b.paymentStatus !== 'PAID' && (
                      <Button
                        size="sm"
                        variant="magenta"
                        onClick={() => handleAction(b.id, 'pay')}
                      >
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        preSelectedStationId={selectedStationForBook}
      />

      <ExtendSessionModal
        isOpen={modalType === 'extend'}
        onClose={() => setModalType(null)}
        booking={activeBookingForModal}
      />

      <PaymentModal
        isOpen={modalType === 'pay'}
        onClose={() => setModalType(null)}
        booking={activeBookingForModal}
      />

      <FoodOrderModal
        isOpen={modalType === 'food'}
        onClose={() => setModalType(null)}
        booking={activeBookingForModal}
      />

      <ReceiptModal
        isOpen={modalType === 'receipt'}
        onClose={() => setModalType(null)}
        booking={activeBookingForModal}
      />
    </div>
  );
};
