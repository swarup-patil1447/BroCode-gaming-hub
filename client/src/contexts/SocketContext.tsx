import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      if (role) {
        socketInstance.emit('join_role_room', role);
        socketInstance.emit('join_role', role);
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Invalidate React Query caches automatically upon socket broadcasts
    const invalidateBookingQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    };

    const invalidateStationQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    };

    const invalidatePaymentQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    };

    const invalidatePricingQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
    };

    const invalidateNotificationQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socketInstance.on('booking.created', invalidateBookingQueries);
    socketInstance.on('booking_created', invalidateBookingQueries);
    socketInstance.on('booking.updated', invalidateBookingQueries);
    socketInstance.on('booking_updated', invalidateBookingQueries);
    socketInstance.on('booking.cancelled', invalidateBookingQueries);
    socketInstance.on('booking_cancelled', invalidateBookingQueries);

    socketInstance.on('station.updated', invalidateStationQueries);
    socketInstance.on('station_updated', invalidateStationQueries);

    socketInstance.on('payment.created', invalidatePaymentQueries);
    socketInstance.on('payment_recorded', invalidatePaymentQueries);

    socketInstance.on('food.added', invalidateBookingQueries);
    socketInstance.on('food_updated', invalidateBookingQueries);

    socketInstance.on('pricing.updated', invalidatePricingQueries);
    socketInstance.on('pricing_updated', invalidatePricingQueries);

    socketInstance.on('notification.created', invalidateNotificationQueries);
    socketInstance.on('notification_created', invalidateNotificationQueries);

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient, role]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  return useContext(SocketContext);
}
