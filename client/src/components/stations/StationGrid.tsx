import React from 'react';
import { Station } from '../../types';
import { StationCard } from './StationCard';
import { Spinner } from '../ui/Feedback';

interface StationGridProps {
  stations: Station[];
  isLoading?: boolean;
  onBook: (stationId: number) => void;
  onViewBooking: (bookingId: string) => void;
  onAddFood: (bookingId: string) => void;
  onPay: (bookingId: string) => void;
  onExtend: (bookingId: string) => void;
}

export const StationGrid: React.FC<StationGridProps> = ({
  stations,
  isLoading,
  onBook,
  onViewBooking,
  onAddFood,
  onPay,
  onExtend,
}) => {
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-slate-400">Loading 8 Gaming Stations...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stations.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          onBook={onBook}
          onViewBooking={onViewBooking}
          onAddFood={onAddFood}
          onPay={onPay}
          onExtend={onExtend}
        />
      ))}
    </div>
  );
};
