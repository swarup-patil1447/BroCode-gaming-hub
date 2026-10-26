import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';

export interface ActiveAlarm {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  tableNumbers: string;
  endTime: string;
}

interface AlarmContextType {
  activeAlarms: ActiveAlarm[];
  isSoundEnabled: boolean;
  toggleSound: () => void;
  triggerAlarm: (alarm: ActiveAlarm) => void;
  dismissAlarm: (bookingId: string) => void;
  muteAll: () => void;
  audioUnlocked: boolean;
  unlockAudio: () => void;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export const AlarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bc_sound_enabled') !== 'false';
  });
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const { socket } = useSocket();

  // Web Audio Context for synthesized beep alarm (reliable across all browsers & iOS)
  const playBeepPattern = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(880, 0, 0.15);
      playTone(1100, 0.2, 0.15);
      playTone(1320, 0.4, 0.25);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, [isSoundEnabled]);

  const unlockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume();
        setAudioUnlocked(true);
      }
    } catch (e) {}
  };

  const triggerAlarm = useCallback(
    (alarm: ActiveAlarm) => {
      setActiveAlarms((prev) => {
        if (prev.some((a) => a.bookingId === alarm.bookingId)) return prev;
        return [...prev, alarm];
      });
      playBeepPattern();
    },
    [playBeepPattern]
  );

  const dismissAlarm = (bookingId: string) => {
    setActiveAlarms((prev) => prev.filter((a) => a.bookingId !== bookingId));
  };

  const muteAll = () => {
    setActiveAlarms([]);
  };

  const toggleSound = () => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('bc_sound_enabled', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!socket) return;

    const handleSessionEnded = (data: any) => {
      triggerAlarm({
        bookingId: data.bookingId,
        bookingCode: data.bookingCode,
        customerName: data.customerName,
        tableNumbers: data.tableNumbers,
        endTime: data.endTime,
      });
    };

    socket.on('session.ended', handleSessionEnded);

    return () => {
      socket.off('session.ended', handleSessionEnded);
    };
  }, [socket, triggerAlarm]);

  return (
    <AlarmContext.Provider
      value={{
        activeAlarms,
        isSoundEnabled,
        toggleSound,
        triggerAlarm,
        dismissAlarm,
        muteAll,
        audioUnlocked,
        unlockAudio,
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
};

export function useAlarm() {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
}
