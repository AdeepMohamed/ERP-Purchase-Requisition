import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Role-based authorization middleware factory.
 * Usage: router.get('/admin-only', authenticate, authorize('admin'), handler)
 *
 * Always used AFTER authenticate — relies on req.user being set.
 * Authorization is checked server-side on every request, not just hidden in the UI.
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Role '${req.user.role}' is not authorized for this action`)
      );
    }

    next();
  };
}
