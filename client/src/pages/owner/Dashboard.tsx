import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { StationGrid } from '../../components/stations/StationGrid';
import { NewBookingModal } from '../../components/bookings/NewBookingModal';
import { ExtendSessionModal } from '../../components/bookings/ExtendSessionModal';
import { PaymentModal } from '../../components/payments/PaymentModal';
import { FoodOrderModal } from '../../components/food/FoodOrderModal';
import { ReceiptModal } from '../../components/bookings/ReceiptModal';
import { formatCurrency, formatTime, formatDate } from '../../lib/utils';
import { Booking } from '../../types';
import {
  DollarSign,
  Gamepad2,
  CheckCircle2,
  XCircle,
  Clock,
  UtensilsCrossed,
  PlusCircle,
  BarChart3,
  Tag,
  Users,
  CreditCard,
  Eye,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedStationForBook, setSelectedStationForBook] = useState<number | null>(null);

  const [activeBookingForModal, setActiveBookingForModal] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<'view' | 'food' | 'pay' | 'extend' | 'receipt' | null>(null);

  // Fetch Dashboard Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.getDashboardSummary(),
    refetchInterval: 10000,
  });

  // Fetch Stations
  const { data: stations = [], isLoading: isStationsLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.stations.getAll(),
    refetchInterval: 5000,
  });

  // Fetch Today's Bookings
  const { data: todayBookings = [] } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: () => api.bookings.getAll({ date: 'today', limit: 8 }),
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            OWNER DASHBOARD
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time live monitoring of all 8 gaming tables, revenue, and cafe operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="magenta"
            onClick={() => navigate('/owner/reports')}
            leftIcon={<BarChart3 className="h-4 w-4" />}
          >
            Reports
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedStationForBook(null);
              setIsNewBookingOpen(true);
            }}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            NEW BOOKING
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (Requirement 9) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Today's Revenue */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Revenue</span>
            <DollarSign className="h-4 w-4 text-cyber-green" />
          </div>
          <div>
            <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide">
              {formatCurrency(summary?.todayRevenue || 0)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Gaming: ₹{summary?.todayGamingSales || 0}
            </p>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Sessions</span>
            <Gamepad2 className="h-4 w-4 text-cyber-cyan" />
          </div>
          <div>
            <span className="font-display font-black text-2xl sm:text-3xl text-cyber-cyan tracking-wide">
              {summary?.activeSessions || 0}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Live gaming now</p>
          </div>
        </div>

        {/* Available Stations */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
            <CheckCircle2 className="h-4 w-4 text-cyber-green" />
          </div>
          <div>
            <span className="font-display font-black text-2xl sm:text-3xl text-cyber-green tracking-wide">
              {summary?.availableStations || 0}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Ready for customers</p>
          </div>
        </div>

        {/* Occupied Stations */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Occupied</span>
            <XCircle className="h-4 w-4 text-cyber-red" />
          </div>
          <div>
            <span className="font-display font-black text-2xl sm:text-3xl text-cyber-red tracking-wide">
              {summary?.occupiedStations || 0}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Out of 8 tables</p>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Pay</span>
            <CreditCard className="h-4 w-4 text-cyber-amber" />
          </div>
          <div>
            <span className="font-display font-black text-2xl sm:text-3xl text-cyber-amber tracking-wide">
              {summary?.pendingPaymentsCount || 0}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              ₹{summary?.pendingPaymentAmount || 0} unpaid
            </p>
          </div>
        </div>

        {/* Food Sales */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Food Sales</span>
            <UtensilsCrossed className="h-4 w-4 text-cyber-magenta" />
          </div>
          <div>
            <span className="font-display font-black text-2xl sm:text-3xl text-cyber-magenta tracking-wide">
              {formatCurrency(summary?.todayFoodSales || 0)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Snacks & drinks</p>
          </div>
        </div>
      </div>

      {/* 8 Gaming Stations Live Grid Section (Requirement 10) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-cyber-cyan" />
            <h2 className="text-xl font-display font-black text-white tracking-wide">
              8 GAMING STATIONS LIVE STATUS
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Auto-synchronized via Socket.IO
          </span>
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

      {/* Today's Recent Bookings Table */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-white">Today's Bookings</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/owner/bookings')}
          >
            View All
          </Button>
        </div>

        {todayBookings.length === 0 ? (
          <p className="text-center py-6 text-slate-500 text-xs">No bookings recorded today yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Booking ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Station(s)</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {todayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-white">{b.bookingCode}</td>
                    <td className="py-3 px-3 font-medium text-slate-200">{b.customerName}</td>
                    <td className="py-3 px-3">
                      {b.stations.map((s) => `Table ${s.station.tableNumber}`).join(', ')}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {formatTime(b.startTime)} - {formatTime(b.endTime)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {formatCurrency(b.grandTotal)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={b.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}>
                        {b.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          b.bookingStatus === 'ACTIVE'
                            ? 'active'
                            : b.bookingStatus === 'COMPLETED'
                            ? 'default'
                            : b.bookingStatus === 'CANCELLED'
                            ? 'cancelled'
                            : 'available'
                        }
                      >
                        {b.bookingStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleAction(b.id, 'receipt')}
                        className="text-cyber-cyan hover:underline font-semibold"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
