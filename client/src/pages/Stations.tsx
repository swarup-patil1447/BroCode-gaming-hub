import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StationGrid } from '../components/stations/StationGrid';
import { NewBookingModal } from '../components/bookings/NewBookingModal';
import { ExtendSessionModal } from '../components/bookings/ExtendSessionModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { FoodOrderModal } from '../components/food/FoodOrderModal';
import { ReceiptModal } from '../components/bookings/ReceiptModal';
import { Booking, Station } from '../types';
import { Gamepad2, PlusCircle, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Stations: React.FC = () => {
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<'view' | 'food' | 'pay' | 'extend' | 'receipt' | null>(null);

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.stations.getAll(),
    refetchInterval: 5000,
  });

  const handleAction = async (bookingId: string, type: 'view' | 'food' | 'pay' | 'extend' | 'receipt') => {
    try {
      const b = await api.bookings.getById(bookingId);
      setActiveBooking(b);
      setModalType(type);
    } catch (err) {
      console.error('Failed to load booking:', err);
    }
  };

  const filteredStations =
    deviceFilter === 'ALL'
      ? stations
      : stations.filter((s) => s.deviceType === deviceFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            GAMING STATIONS (8 TABLES)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time station status, live countdown timers, and accurate next free availability
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setSelectedStationId(null);
            setIsNewBookingOpen(true);
          }}
          leftIcon={<PlusCircle className="h-4 w-4" />}
          className="font-bold"
        >
          NEW BOOKING
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-dark-900 border border-slate-800">
        {[
          { id: 'ALL', label: 'All 8 Tables' },
          { id: 'PS5', label: 'PS5 (Tables 1 & 2)' },
          { id: 'PS4', label: 'PS4 (Tables 3 & 4)' },
          { id: 'CAR_SIMULATOR', label: 'Car Simulator (Tables 5 & 6)' },
          { id: 'PC', label: 'PC (Tables 7 & 8)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDeviceFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              deviceFilter === tab.id
                ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 8 Stations Grid */}
      <StationGrid
        stations={filteredStations}
        isLoading={isLoading}
        onBook={(stId) => {
          setSelectedStationId(stId);
          setIsNewBookingOpen(true);
        }}
        onViewBooking={(bId) => handleAction(bId, 'receipt')}
        onAddFood={(bId) => handleAction(bId, 'food')}
        onPay={(bId) => handleAction(bId, 'pay')}
        onExtend={(bId) => handleAction(bId, 'extend')}
      />

      {/* Modals */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        preSelectedStationId={selectedStationId}
      />

      <ExtendSessionModal
        isOpen={modalType === 'extend'}
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
