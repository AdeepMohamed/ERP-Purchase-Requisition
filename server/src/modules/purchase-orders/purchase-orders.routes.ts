import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { UpdatePOStatusSchema } from '../../utils/validate';
import { listPurchaseOrders, updatePOStatus } from './purchase-orders.service';

const router = Router();

router.use(authenticate);

// GET /api/purchase-orders
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listPurchaseOrders(req.user));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/purchase-orders/:id/status — managers and admins only
router.patch(
  '/:id/status',
  authorize('manager', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UpdatePOStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      }
      res.json(await updatePOStatus(req.params.id, parsed.data, req.user));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
