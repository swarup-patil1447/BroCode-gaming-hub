"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwner = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../utils/prisma");
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        // Verify token version & active account status from DB
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, isActive: true, tokenVersion: true, role: true, name: true, employeeId: true },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Unauthorized: User account not found or inactive' });
        }
        if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({ error: 'Session invalidated due to password change. Please login again.' });
        }
        req.user = {
            id: user.id,
            employeeId: user.employeeId,
            name: user.name,
            role: user.role,
            tokenVersion: user.tokenVersion,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
};
exports.authenticate = authenticate;
const requireOwner = (req, res, next) => {
    if (!req.user || req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Owner access required.' });
    }
    next();
};
exports.requireOwner = requireOwner;
