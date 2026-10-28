import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Gamepad2,
  CalendarDays,
  UtensilsCrossed,
  Plus,
  Menu,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const MobileNav: React.FC<{
  onNewBooking: () => void;
  onOpenDrawer?: () => void;
}> = ({ onNewBooking, onOpenDrawer }) => {
  const { role } = useAuth();
  const isOwner = role === 'OWNER';

  const basePrefix = isOwner ? '/owner' : '/employee';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/95 backdrop-blur-xl border-t border-slate-800 px-2 py-2 flex items-center justify-around safe-area-bottom">
      {/* Dashboard */}
      <NavLink
        to={`${basePrefix}/dashboard`}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-colors flex-1',
            isActive ? 'text-cyber-cyan' : 'text-slate-400 hover:text-slate-200'
          )
        }
      >
        <LayoutDashboard className="h-5 w-5 mb-1" />
        <span>Home</span>
      </NavLink>

      {/* Stations Grid */}
      <NavLink
        to={`${basePrefix}/stations`}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-colors flex-1',
            isActive ? 'text-cyber-cyan' : 'text-slate-400 hover:text-slate-200'
          )
        }
      >
        <Gamepad2 className="h-5 w-5 mb-1" />
        <span>Stations</span>
      </NavLink>

      {/* Quick Booking Floating Action Target */}
      <div className="flex-1 flex justify-center -mt-5">
        <button
          onClick={onNewBooking}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-cyber-cyan to-blue-600 text-dark-950 flex items-center justify-center shadow-glow-cyan/60 active:scale-95 transition-transform border-4 border-dark-950"
          title="New Booking"
          aria-label="New Booking"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Bookings */}
      <NavLink
        to={`${basePrefix}/bookings`}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-colors flex-1',
            isActive ? 'text-cyber-cyan' : 'text-slate-400 hover:text-slate-200'
          )
        }
      >
        <CalendarDays className="h-5 w-5 mb-1" />
        <span>Bookings</span>
      </NavLink>

      {/* Drawer Menu Button for All Dashboard Sections */}
      {onOpenDrawer ? (
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open all dashboard sections menu"
          className="flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-cyber-cyan active:scale-95 transition-all flex-1"
        >
          <Menu className="h-5 w-5 mb-1" />
          <span>Menu</span>
        </button>
      ) : (
        <NavLink
          to={`${basePrefix}/food`}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-colors flex-1',
              isActive ? 'text-cyber-cyan' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <UtensilsCrossed className="h-5 w-5 mb-1" />
          <span>Food</span>
        </NavLink>
      )}
    </div>
  );
};
