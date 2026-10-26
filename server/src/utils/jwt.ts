import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export interface JwtPayload {
  id: string;
  employeeId: string;
  role: string;
  name: string;
  tokenVersion?: number;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, CONFIG.JWT_SECRET) as JwtPayload;
};

