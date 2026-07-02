import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { CreateRequisitionSchema } from '../../utils/validate';
import {
  listRequisitions,
  getRequisition,
  createRequisition,
} from './requisitions.service';

const router = Router();

// All requisition routes require authentication
router.use(authenticate);

// GET /api/requisitions — scoped to role (employee=own, manager=dept, admin=all)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listRequisitions(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/requisitions/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getRequisition(req.params.id, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/requisitions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateRequisitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const requisition = await createRequisition(parsed.data, req.user);
    res.status(201).json(requisition);
  } catch (err) {
    next(err);
  }
});

export default router;
