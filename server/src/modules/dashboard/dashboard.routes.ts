import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { getDashboardStats } from './dashboard.service';

const router = Router();

// GET /api/dashboard — all authenticated roles; data scoped inside service
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getDashboardStats(req.user));
  } catch (err) {
    next(err);
  }
});

export default router;
