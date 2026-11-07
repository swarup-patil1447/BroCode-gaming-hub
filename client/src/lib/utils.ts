import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Station } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function groupStationsByTable(stations: Station[]): Station[] {
  const grouped = new Map<number, Station[]>();
  stations.forEach((station) => {
    const group = grouped.get(station.tableNumber) || [];
    group.push(station);
    grouped.set(station.tableNumber, group);
  });

  return Array.from(grouped.entries()).map(([tableNumber, group]) => {
    const active = group.find((station) => station.isOccupied && station.currentBooking);
    const reservations = Array.from(
      new Map(group.flatMap((station) => station.upcomingBookings || []).map((booking) => [booking.id, booking])).values()
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const representative = group.find((station) => station.status !== 'MAINTENANCE') || group[0];

    return {
      ...representative,
      status: (group.every((station) => station.status === 'MAINTENANCE')
        ? 'MAINTENANCE'
        : active
        ? 'OCCUPIED'
        : 'AVAILABLE') as Station['status'],
      isOccupied: !!active,
      remainingSeconds: active?.remainingSeconds || 0,
      nextAvailableTime: active?.nextAvailableTime || 'Available Now',
      nextAvailableTimestamp: active?.nextAvailableTimestamp,
      availableUntil: reservations[0] ? formatTime(reservations[0].startTime) : null,
      upcomingBookingsCount: reservations.length,
      currentBooking: active?.currentBooking || null,
      nextUpcomingBooking: reservations[0] || null,
      upcomingBookings: reservations,
      tableNumber,
    };
  }).sort((a, b) => a.tableNumber - b.tableNumber);
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

export function formatTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

export function getDeviceColor(deviceType: string): string {
  switch (deviceType) {
    case 'PS5':
      return 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/10';
    case 'PS4':
      return 'text-cyber-purple border-cyber-purple/30 bg-cyber-purple/10';
    case 'CAR_SIMULATOR':
    case 'SIMULATOR':
      return 'text-cyber-magenta border-cyber-magenta/30 bg-cyber-magenta/10';
    case 'PC':
      return 'text-cyber-green border-cyber-green/30 bg-cyber-green/10';
    default:
      return 'text-slate-300 border-slate-700 bg-slate-800';
  }
}

export function getDeviceLabel(deviceType: string): string {
  switch (deviceType) {
    case 'CAR_SIMULATOR':
    case 'SIMULATOR':
      return 'CAR SIMULATOR';
    default:
      return deviceType;
  }
}
