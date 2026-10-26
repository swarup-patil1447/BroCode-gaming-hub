import React from 'react';
import { useAlarm } from '../../contexts/AlarmContext';
import { BellRing, VolumeX, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

export const SessionEndAlarmModal: React.FC<{ onExtend: (bookingId: string) => void }> = ({ onExtend }) => {
  const { activeAlarms, dismissAlarm, muteAll } = useAlarm();

  if (activeAlarms.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-pulse-slow">
      <div className="relative w-full max-w-lg rounded-3xl bg-dark-900 border-2 border-cyber-red shadow-2xl shadow-cyber-red/30 p-6 sm:p-8 text-center space-y-6 overflow-hidden">
        {/* Glowing Ambient Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-cyber-red rounded-full blur-sm" />

        {/* Pulsing Icon */}
        <div className="mx-auto h-20 w-20 rounded-full bg-rose-950/80 border-2 border-cyber-red flex items-center justify-center text-cyber-red animate-bounce shadow-glow-red">
          <BellRing className="h-10 w-10 stroke-[2.5]" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-cyber-red/20 text-cyber-red text-xs font-extrabold uppercase tracking-widest border border-cyber-red/40 mb-2">
            Alarm Triggered
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            SESSION ENDED
          </h2>
        </div>

        {/* List of Ended Sessions */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {activeAlarms.map((alarm) => (
            <div
              key={alarm.bookingId}
              className="p-4 rounded-2xl bg-dark-950/80 border border-slate-700/80 text-left flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-cyber-cyan font-display tracking-wide">
                    {alarm.tableNumbers}
                  </span>
                  <span className="text-xs font-mono text-slate-400">({alarm.bookingCode})</span>
                </div>
                <p className="text-sm font-bold text-white mt-0.5">
                  Customer: <span className="text-slate-200">{alarm.customerName}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    dismissAlarm(alarm.bookingId);
                    onExtend(alarm.bookingId);
                  }}
                  leftIcon={<Clock className="h-3.5 w-3.5" />}
                >
                  Extend
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => dismissAlarm(alarm.bookingId)}
                  leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Global Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={muteAll}
            leftIcon={<VolumeX className="h-4 w-4" />}
          >
            MUTE ALL ALARMS
          </Button>
        </div>
      </div>
    </div>
  );
};
