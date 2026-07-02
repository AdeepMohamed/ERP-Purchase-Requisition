import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';

// Extend Express's Request type to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        department: string;
        isDeptHead: boolean;
      };
    }
  }
}

/**
 * JWT authentication middleware.
 * Reads the Bearer token from Authorization header, verifies it, and attaches
 * the decoded payload to req.user for downstream middleware and controllers.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');

    const decoded = jwt.verify(token, secret) as Express.Request['user'];
    req.user = decoded;
    next();
  } catch {
    // Distinguish expired vs invalid token for clearer client error messages
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
