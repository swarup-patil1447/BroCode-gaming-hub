import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Booking } from '../types';
import { NewBookingModal } from '../components/bookings/NewBookingModal';
import { ExtendSessionModal } from '../components/bookings/ExtendSessionModal';
import { CancelBookingModal } from '../components/bookings/CancelBookingModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { FoodOrderModal } from '../components/food/FoodOrderModal';
import { ReceiptModal } from '../components/bookings/ReceiptModal';
import { formatCurrency, formatTime, formatDate } from '../lib/utils';
import {
  CalendarDays,
  Search,
  PlusCircle,
  Clock,
  CreditCard,
  UtensilsCrossed,
  Printer,
  Trash2,
  Eye,
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export const Bookings: React.FC = () => {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<'extend' | 'cancel' | 'pay' | 'food' | 'receipt' | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', statusFilter, dateFilter, paymentFilter, search],
    queryFn: () =>
      api.bookings.getAll({
        status: statusFilter,
        date: dateFilter,
        paymentStatus: paymentFilter,
        search,
      }),
  });

  const openAction = (booking: Booking, type: 'extend' | 'cancel' | 'pay' | 'food' | 'receipt') => {
    setActiveBooking(booking);
    setModalType(type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            BOOKING MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, view details, extend sessions, and print invoices
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsNewBookingOpen(true)}
          leftIcon={<PlusCircle className="h-4 w-4" />}
          className="font-bold"
        >
          NEW BOOKING
        </Button>
      </div>

      {/* Filters & Search Bar (Requirement 18) */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search by customer, mobile, ID, table..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Dates' },
              { id: 'today', label: 'Today' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  dateFilter === d.id
                    ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/30'
                    : 'bg-dark-850 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Quick Payment Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Payments' },
              { id: 'UNPAID', label: 'Unpaid' },
              { id: 'PAID', label: 'Paid' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPaymentFilter(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  paymentFilter === p.id
                    ? 'bg-cyber-magenta text-white shadow-glow-magenta/30'
                    : 'bg-dark-850 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'ACTIVE', label: 'Active Sessions' },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s.id
                  ? 'bg-dark-800 text-white border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List Table / Cards */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 space-y-4 shadow-xl">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400 text-sm">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="text-center py-12 text-slate-500 text-sm">No matching bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-3">Booking ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Tables</th>
                  <th className="py-3 px-3">Start - End</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-white">
                      {b.bookingCode}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-slate-100">{b.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{b.customerMobile}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      {b.stations.map((s) => (
                        <span
                          key={s.id}
                          className="inline-block mr-1 px-1.5 py-0.5 rounded bg-dark-950 border border-slate-700 text-[10px] font-mono"
                        >
                          T{s.station.tableNumber} ({s.station.deviceType})
                        </span>
                      ))}
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <div>{formatDate(b.startTime)}</div>
                      <div className="text-slate-400">
                        {formatTime(b.startTime)} - {formatTime(b.endTime)}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-white text-sm">
                      {formatCurrency(b.grandTotal)}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={b.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}>
                        {b.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3">
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
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAction(b, 'receipt')}
                          className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white"
                          title="Print Receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openAction(b, 'food')}
                          className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-cyber-amber"
                          title="Add Food"
                        >
                          <UtensilsCrossed className="h-3.5 w-3.5" />
                        </button>
                        {b.bookingStatus !== 'CANCELLED' && b.bookingStatus !== 'COMPLETED' && (
                          <button
                            onClick={() => openAction(b, 'extend')}
                            className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-cyber-cyan"
                            title="Extend Session"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {b.paymentStatus !== 'PAID' && b.bookingStatus !== 'CANCELLED' && (
                          <button
                            onClick={() => openAction(b, 'pay')}
                            className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-cyber-magenta font-bold"
                            title="Pay"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {b.bookingStatus !== 'CANCELLED' && (
                          <button
                            onClick={() => openAction(b, 'cancel')}
                            className="p-1.5 rounded-lg bg-dark-850 hover:bg-rose-950 text-cyber-red"
                            title="Cancel Booking"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
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
      />

      <ExtendSessionModal
        isOpen={modalType === 'extend'}
        onClose={() => setModalType(null)}
        booking={activeBooking}
      />

      <CancelBookingModal
        isOpen={modalType === 'cancel'}
        onClose={() => setModalType(null)}
        booking={activeBooking}
      />

      <PaymentModal
        isOpen={modalType === 'pay'}
        onClose={() => setModalType(null)}
        booking={activeBooking}
      />

      <FoodOrderModal
        isOpen={modalType === 'food'}
        onClose={() => setModalType(null)}
        booking={activeBooking}
      />

      <ReceiptModal
        isOpen={modalType === 'receipt'}
        onClose={() => setModalType(null)}
        booking={activeBooking}
      />
    </div>
  );
};
