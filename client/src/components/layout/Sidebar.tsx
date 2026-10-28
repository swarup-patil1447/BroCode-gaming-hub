import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Gamepad2,
  CalendarDays,
  Tag,
  UtensilsCrossed,
  Users,
  BarChart3,
  FileText,
  Settings,
  UserCheck,
  PlusCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC<{ onNewBooking: () => void }> = ({ onNewBooking }) => {
  const { role } = useAuth();

  const isOwner = role === 'OWNER';

  const navItems = isOwner
    ? [
        { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
        { label: 'Stations Grid', path: '/owner/stations', icon: Gamepad2 },
        { label: 'Bookings', path: '/owner/bookings', icon: CalendarDays },
        { label: 'Pricing', path: '/owner/pricing', icon: Tag },
        { label: 'Food & Drinks', path: '/owner/food', icon: UtensilsCrossed },
        { label: 'Employees', path: '/owner/employees', icon: Users },
        { label: 'Reports', path: '/owner/reports', icon: BarChart3 },
        { label: 'Audit Logs', path: '/owner/audit', icon: FileText },
        { label: 'Settings', path: '/owner/settings', icon: Settings },
        { label: 'Profile', path: '/owner/profile', icon: UserCheck },
      ]
    : [
        { label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
        { label: 'Stations Grid', path: '/employee/stations', icon: Gamepad2 },
        { label: 'Bookings', path: '/employee/bookings', icon: CalendarDays },
        { label: 'Food Menu', path: '/employee/food', icon: UtensilsCrossed },
        { label: 'My Profile', path: '/employee/profile', icon: UserCheck },
      ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800/80 bg-dark-900/60 p-4 space-y-6 shrink-0">
      {/* Quick Booking Button */}
      <button
        onClick={onNewBooking}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-600 text-dark-950 font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-glow-cyan/50 hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <PlusCircle className="h-5 w-5" />
        <span>NEW BOOKING</span>
      </button>

      {/* Navigation List */}
      <nav className="space-y-1 flex-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          {isOwner ? 'Management' : 'Operations'}
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 shadow-glow-cyan/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* System Badge */}
      <div className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 text-center">
        <p className="text-xs font-bold text-slate-300">BroCode System v1.0</p>
        <p className="text-[10px] text-slate-500 mt-0.5">8 Stations Live Monitoring</p>
      </div>
    </aside>
  );
};
