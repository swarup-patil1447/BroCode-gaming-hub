import React from 'react';
import { Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatTime, formatDate } from '../../lib/utils';
import { Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalPaid = (booking.payments || []).reduce((acc, p) => acc + p.amount, 0);
  const paymentMethod = booking.payments && booking.payments.length > 0 ? booking.payments[0].paymentMethod : 'UNPAID';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gaming & Cafe Receipt"
      subtitle={`Receipt for ${booking.bookingCode}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Printable Receipt Layout */}
        <div
          id="receipt-print-area"
          className="p-6 rounded-2xl bg-white text-slate-900 shadow-inner font-mono text-xs space-y-4 border border-slate-300"
        >
          {/* Cafe Header */}
          <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
            <h2 className="text-xl font-black font-display tracking-widest text-slate-950">
              BROCODE
            </h2>
            <p className="text-[11px] font-bold tracking-widest text-slate-700 uppercase">
              GAMING CAFE
            </p>
            <p className="text-[10px] text-slate-500">Premium Console & PC Lounge</p>
          </div>

          {/* Receipt Info */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Booking No:</span>
              <span className="font-bold text-slate-900">{booking.bookingCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Date:</span>
              <span>{formatDate(booking.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Customer:</span>
              <span className="font-bold">{booking.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mobile:</span>
              <span>{booking.customerMobile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Time:</span>
              <span>
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)} ({booking.durationMinutes / 60}h)
              </span>
            </div>
          </div>

          {/* Gaming Charges Breakdown */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
            <p className="font-bold text-slate-800 uppercase text-[10px]">Gaming Stations</p>
            {booking.stations.map((s) => {
              const isSim = s.station.deviceType === 'CAR_SIMULATOR' || s.station.deviceType === 'SIMULATOR';
              const stationCharge = s.appliedRatePerHour * (booking.durationMinutes / 60);
              return (
                <div key={s.id} className="flex justify-between">
                  <span>
                    Table {s.station.tableNumber} ({s.station.deviceType}
                    {s.station.deviceType.includes('PS') ? ` • ${booking.controllerCount}P` : ''})
                    {isSim
                      ? ` (${booking.durationMinutes}m @ ₹${s.appliedRatePerHour / 2}/30m)`
                      : ` (${booking.durationMinutes / 60}h @ ₹${s.appliedRatePerHour}/hr)`}
                  </span>
                  <span className="font-bold">
                    ₹{stationCharge}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Food Charges Breakdown */}
          {booking.foodItems && booking.foodItems.length > 0 && (
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
              <p className="font-bold text-slate-800 uppercase text-[10px]">Food & Drinks</p>
              {booking.foodItems.map((f) => (
                <div key={f.id} className="flex justify-between">
                  <span>
                    {f.foodName} × {f.quantity}
                  </span>
                  <span className="font-bold">₹{f.totalPrice}</span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 pt-1 text-[11px]">
            <div className="flex justify-between">
              <span>Gaming Total:</span>
              <span>₹{booking.gamingAmount}</span>
            </div>
            {booking.foodAmount > 0 && (
              <div className="flex justify-between">
                <span>Food Total:</span>
                <span>₹{booking.foodAmount}</span>
              </div>
            )}
            {booking.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-₹{booking.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black border-t border-slate-900 pt-1.5">
              <span>GRAND TOTAL:</span>
              <span>₹{booking.grandTotal}</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1 text-slate-700">
              <span>Payment Status:</span>
              <span className="font-bold uppercase">{booking.paymentStatus} ({paymentMethod})</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[10px] text-slate-500 space-y-1">
            <p>Served by: {booking.createdByName || booking.createdBy?.name || 'Staff'}</p>
            <p className="font-bold text-slate-800">Thank you for gaming with BroCode!</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2 no-print">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            PRINT RECEIPT
          </Button>
        </div>
      </div>
    </Modal>
  );
};
