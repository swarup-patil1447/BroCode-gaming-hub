import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useAlarm } from '../../contexts/AlarmContext';
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
  X,
  LogOut,
  Bell,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNewBooking: () => void;
  onOpenNotifications?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  onNewBooking,
  onOpenNotifications,
}) => {
  const { user, role, logout } = useAuth();
  const { isConnected } = useSocket();
  const { isSoundEnabled, toggleSound, audioUnlocked, unlockAudio } = useAlarm();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isOwner = role === 'OWNER';

  // Navigation items strictly segregated by role authorization
  const navItems = isOwner
    ? [
        { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
        { label: 'Stations Grid', path: '/owner/stations', icon: Gamepad2 },
        { label: 'Bookings', path: '/owner/bookings', icon: CalendarDays },
        { label: 'Pricing Management', path: '/owner/pricing', icon: Tag },
        { label: 'Food & Drinks', path: '/owner/food', icon: UtensilsCrossed },
        { label: 'Employee Management', path: '/owner/employees', icon: Users },
        { label: 'Reports & Analytics', path: '/owner/reports', icon: BarChart3 },
        { label: 'Audit Logs', path: '/owner/audit', icon: FileText },
        { label: 'Settings', path: '/owner/settings', icon: Settings },
        { label: 'My Profile', path: '/owner/profile', icon: UserCheck },
      ]
    : [
        { label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
        { label: 'Stations Grid', path: '/employee/stations', icon: Gamepad2 },
        { label: 'Bookings', path: '/employee/bookings', icon: CalendarDays },
        { label: 'Food Menu', path: '/employee/food', icon: UtensilsCrossed },
        { label: 'My Profile', path: '/employee/profile', icon: UserCheck },
      ];

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Focus close button on open
      setTimeout(() => closeButtonRef.current?.focus(), 50);
      // Lock body scroll to prevent background scrolling
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        ref={drawerRef}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-dark-950 border-r border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden safe-area-bottom',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="h-16 border-b border-slate-800/90 px-4 flex items-center justify-between shrink-0 bg-dark-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyber-cyan via-cyber-magenta to-purple-600 p-[2px] shadow-glow-cyan/30 shrink-0">
              <div className="h-full w-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <span className="font-display font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan to-cyber-magenta">
                  BC
                </span>
              </div>
            </div>
            <div>
              <span className="font-display font-extrabold text-base tracking-wider text-white">
                BROCODE
              </span>
              <span className="block text-[10px] font-semibold text-cyber-cyan uppercase tracking-widest">
                Gaming Cafe
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-2 rounded-xl bg-dark-850 border border-slate-700 text-slate-400 hover:text-white hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-cyber-cyan/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Status Bar */}
        <div className="p-4 bg-dark-900/40 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white truncate max-w-[160px]">
                {user?.name || 'Staff Member'}
              </p>
              <p className="text-[11px] font-mono text-slate-400">{user?.employeeId}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={isOwner ? 'magenta' : 'cyan'} className="py-0.5 px-2 text-[10px]">
                {role}
              </Badge>
              <div className="flex items-center gap-1 text-[10px]">
                {isConnected ? (
                  <span className="text-cyber-green flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> Live
                  </span>
                ) : (
                  <span className="text-cyber-red flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick New Booking Button inside Drawer */}
          <button
            onClick={() => {
              onClose();
              onNewBooking();
            }}
            className="w-full mt-3 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-600 text-dark-950 font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-glow-cyan/40 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>NEW BOOKING</span>
          </button>
        </div>

        {/* Navigation List */}
        <nav
          className="flex-1 overflow-y-auto p-3 space-y-1"
          aria-label="Drawer Navigation Links"
        >
          <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            {isOwner ? 'Owner Management' : 'Staff Operations'}
          </p>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px]',
                  isActive
                    ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 shadow-glow-cyan/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 active:bg-white/10'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Drawer Actions */}
        <div className="p-3 bg-dark-900/80 border-t border-slate-800 shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                if (!audioUnlocked) unlockAudio();
                toggleSound();
              }}
              className="py-2 px-2.5 rounded-xl bg-dark-850 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {isSoundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-cyber-cyan" />
                  <span>Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                  <span>Muted</span>
                </>
              )}
            </button>

            {/* Notifications Shortcut */}
            {onOpenNotifications && (
              <button
                onClick={() => {
                  onClose();
                  onOpenNotifications();
                }}
                className="py-2 px-2.5 rounded-xl bg-dark-850 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bell className="h-3.5 w-3.5 text-cyber-magenta" />
                <span>Alerts</span>
              </button>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            <LogOut className="h-4 w-4" />
            <span>SIGN OUT</span>
          </button>

          <p className="text-[10px] text-center text-slate-500 font-mono pt-1">
            BroCode Gaming Cafe Hub v1.0
          </p>
        </div>
      </aside>
    </>
  );
};
