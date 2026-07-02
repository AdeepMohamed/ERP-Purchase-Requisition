import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
} from '../../utils/validate';
import {
  listInventoryItems,
  createInventoryItem,
  updateInventoryItem,
} from './inventory.service';

const router = Router();

router.use(authenticate);

// GET /api/inventory — all roles can view
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listInventoryItems());
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory — admin only
router.post(
  '/',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateInventoryItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      }
      res.status(201).json(await createInventoryItem(parsed.data));
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/inventory/:id — admin and manager
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UpdateInventoryItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      }
      res.json(await updateInventoryItem(req.params.id, parsed.data, req.user));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
