import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { NewBookingModal } from '../bookings/NewBookingModal';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { SessionEndAlarmModal } from '../alarm/SessionEndAlarmModal';
import { ExtendSessionModal } from '../bookings/ExtendSessionModal';
import { ForcePasswordChangeModal } from '../auth/ForcePasswordChangeModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Booking } from '../../types';

export const Layout: React.FC = () => {
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [extendBookingId, setExtendBookingId] = useState<string | null>(null);

  // Fetch booking details if extend is requested from alarm
  const { data: extendBooking } = useQuery({
    queryKey: ['booking', extendBookingId],
    queryFn: () => (extendBookingId ? api.bookings.getById(extendBookingId) : null),
    enabled: !!extendBookingId,
  });

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Mandatory Force Password Change Overlay */}
      <ForcePasswordChangeModal />

      {/* Top Navigation */}
      <Navbar onOpenNotifications={() => setIsNotificationsOpen(true)} />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar onNewBooking={() => setIsNewBookingOpen(true)} />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav onNewBooking={() => setIsNewBookingOpen(true)} />

      {/* Global Modals */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <SessionEndAlarmModal
        onExtend={(bookingId) => setExtendBookingId(bookingId)}
      />

      <ExtendSessionModal
        isOpen={!!extendBookingId}
        onClose={() => setExtendBookingId(null)}
        booking={extendBooking || null}
      />
    </div>
  );
};
