import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useAlarm } from '../../contexts/AlarmContext';
import {
  Gamepad2,
  Bell,
  Volume2,
  VolumeX,
  LogOut,
  User as UserIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const Navbar: React.FC<{ onOpenNotifications: () => void }> = ({ onOpenNotifications }) => {
  const { user, logout, role } = useAuth();
  const { isConnected } = useSocket();
  const { isSoundEnabled, toggleSound, audioUnlocked, unlockAudio } = useAlarm();

  // Fetch unread notifications count
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.getAll(),
    refetchInterval: 15000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-slate-800/80 bg-dark-950/85 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyber-cyan via-cyber-magenta to-purple-600 p-[2px] shadow-glow-cyan/30">
          <div className="h-full w-full bg-dark-950 rounded-[10px] flex items-center justify-center">
            <span className="font-display font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan to-cyber-magenta">
              BC
            </span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-lg tracking-wider text-white">
              BROCODE
            </span>
            <span className="text-[10px] font-semibold text-cyber-cyan uppercase tracking-widest hidden sm:inline-block">
              Gaming Cafe
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Connection Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-950/60 border-emerald-500/30 text-cyber-green'
              : 'bg-rose-950/60 border-rose-500/30 text-cyber-red animate-pulse'
          }`}
          title={isConnected ? 'Live Socket Connected' : 'Connection Lost - Retrying'}
        >
          {isConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Offline</span>
            </>
          )}
        </div>

        {/* Alarm Audio Toggle */}
        <button
          onClick={() => {
            if (!audioUnlocked) unlockAudio();
            toggleSound();
          }}
          className={`p-2 rounded-xl border transition-all ${
            isSoundEnabled
              ? 'bg-dark-850 border-slate-700 text-cyber-cyan hover:bg-dark-800'
              : 'bg-dark-850 border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
          title={isSoundEnabled ? 'Alarm Sound: Enabled' : 'Alarm Sound: Muted'}
        >
          {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl bg-dark-850 border border-slate-700 text-slate-300 hover:text-white hover:bg-dark-800 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyber-magenta px-1 text-[10px] font-extrabold text-white shadow-glow-magenta animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-200">{user?.name || 'User'}</p>
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] text-slate-400 font-mono">{user?.employeeId}</span>
              <Badge variant={role === 'OWNER' ? 'magenta' : 'cyan'} className="py-0 px-1.5 text-[9px]">
                {role}
              </Badge>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
