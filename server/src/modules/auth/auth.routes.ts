import { Router, Request, Response, NextFunction } from 'express';
import { LoginSchema } from '../../utils/validate';
import { loginService } from './auth.service';
import { authenticate } from '../../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const result = await loginService(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — returns current user from JWT (useful for frontend session restoration)
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
