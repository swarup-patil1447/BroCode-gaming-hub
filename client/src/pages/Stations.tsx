import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StationGrid } from '../components/stations/StationGrid';
import { NewBookingModal } from '../components/bookings/NewBookingModal';
import { ExtendSessionModal } from '../components/bookings/ExtendSessionModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { FoodOrderModal } from '../components/food/FoodOrderModal';
import { ReceiptModal } from '../components/bookings/ReceiptModal';
import { Booking, Station } from '../types';
import { Gamepad2, PlusCircle, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';

export const Stations: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isRegisterConsoleOpen, setIsRegisterConsoleOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [consoleTableNumber, setConsoleTableNumber] = useState('4');
  const [consoleError, setConsoleError] = useState<string | null>(null);
  const [consoleSuccess, setConsoleSuccess] = useState<string | null>(null);

  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<'view' | 'food' | 'pay' | 'extend' | 'receipt' | null>(null);

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.stations.getAll(),
    refetchInterval: 5000,
  });

  const tableOptions = useMemo(
    () => Array.from(new Set(stations.map((station) => station.tableNumber))).sort((a, b) => a - b),
    [stations]
  );

  const registerConsoleMutation = useMutation({
    mutationFn: () => api.stations.registerConsole(Number(consoleTableNumber)),
    onSuccess: async (station) => {
      await queryClient.invalidateQueries({ queryKey: ['stations'] });
      setConsoleError(null);
      setConsoleSuccess(`Added an additional ${station.deviceType} console to Table ${station.tableNumber}.`);
      setIsRegisterConsoleOpen(false);
    },
    onError: (err: any) => {
      setConsoleError(err.message || 'Unable to register console.');
    },
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
      : stations.filter((s) => {
          if (deviceFilter === 'CAR_SIMULATOR') {
            return s.deviceType === 'CAR_SIMULATOR' || s.deviceType === 'SIMULATOR';
          }
          return s.deviceType === deviceFilter;
        });

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

        <div className="flex flex-wrap gap-2">
          {role === 'OWNER' && (
            <Button
              variant="outline"
              onClick={() => {
                setConsoleError(null);
                setConsoleSuccess(null);
                setIsRegisterConsoleOpen(true);
              }}
              leftIcon={<Gamepad2 className="h-4 w-4" />}
              className="font-bold"
            >
              REGISTER CONSOLE
            </Button>
          )}
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
      </div>

      {consoleSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {consoleSuccess}
        </div>
      )}

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

      <Modal
        isOpen={isRegisterConsoleOpen}
        onClose={() => setIsRegisterConsoleOpen(false)}
        title="Register Additional Console"
        subtitle="Add a physical console to a table's inventory. It will then appear in Add Console."
        maxWidth="md"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setConsoleError(null);
            registerConsoleMutation.mutate();
          }}
        >
          {consoleError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {consoleError}
            </div>
          )}
          <Select
            label="Assign console to table"
            value={consoleTableNumber}
            onChange={(event) => setConsoleTableNumber(event.target.value)}
            options={tableOptions.map((tableNumber) => ({
              value: tableNumber,
              label: `Table ${tableNumber}`,
            }))}
            required
          />
          <p className="text-xs text-slate-400">
            The console type will match the existing consoles on the selected table. Only register hardware that is physically assigned there.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsRegisterConsoleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={registerConsoleMutation.isPending || tableOptions.length === 0}>
              {registerConsoleMutation.isPending ? 'Registering…' : 'Register Console'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
