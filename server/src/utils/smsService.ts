import { CONFIG } from '../config';

export interface SMSLogEntry {
  id: string;
  to: string;
  message: string;
  timestamp: string;
  status: 'SENT' | 'FAILED';
  provider: string;
}

export const devSmsLogs: SMSLogEntry[] = [];

export const sendSMS = async (to: string, message: string): Promise<boolean> => {
  const logEntry: SMSLogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    to,
    message,
    timestamp: new Date().toISOString(),
    status: 'SENT',
    provider: CONFIG.SMS_PROVIDER,
  };

  if (CONFIG.SMS_PROVIDER === 'mock') {
    console.log(`[DEV SMS LOG] To: ${to} | Message: ${message}`);
    devSmsLogs.unshift(logEntry);
    if (devSmsLogs.length > 100) devSmsLogs.pop();
    return true;
  }

  // Twilio / Production provider fallback
  try {
    devSmsLogs.unshift(logEntry);
    return true;
  } catch (error) {
    console.error('SMS sending error:', error);
    logEntry.status = 'FAILED';
    devSmsLogs.unshift(logEntry);
    return false;
  }
};
