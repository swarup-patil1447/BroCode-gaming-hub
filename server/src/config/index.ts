import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
    PORT: process.env.PORT || 5000,
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
    JWT_SECRET: process.env.JWT_SECRET || 'brocode_super_secret_jwt_key_2026_gaming_cafe_prod_key',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    NODE_ENV: process.env.NODE_ENV || 'development',
    SMS_PROVIDER: process.env.SMS_PROVIDER || 'mock',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
};

