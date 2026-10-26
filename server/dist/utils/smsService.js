"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = exports.devSmsLogs = void 0;
const config_1 = require("../config");
exports.devSmsLogs = [];
const sendSMS = async (to, message) => {
    const logEntry = {
        id: Math.random().toString(36).substring(2, 9),
        to,
        message,
        timestamp: new Date().toISOString(),
        status: 'SENT',
        provider: config_1.CONFIG.SMS_PROVIDER,
    };
    if (config_1.CONFIG.SMS_PROVIDER === 'mock') {
        console.log(`[DEV SMS LOG] To: ${to} | Message: ${message}`);
        exports.devSmsLogs.unshift(logEntry);
        if (exports.devSmsLogs.length > 100)
            exports.devSmsLogs.pop();
        return true;
    }
    // Twilio / Production provider fallback
    try {
        exports.devSmsLogs.unshift(logEntry);
        return true;
    }
    catch (error) {
        console.error('SMS sending error:', error);
        logEntry.status = 'FAILED';
        exports.devSmsLogs.unshift(logEntry);
        return false;
    }
};
exports.sendSMS = sendSMS;
