import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { ApprovalDecisionSchema } from '../../utils/validate';
import { decideRequisition } from './approvals.service';

const router = Router();

// POST /api/approvals/:requisitionId/decide — managers and admins only
router.post(
  '/:requisitionId/decide',
  authenticate,
  authorize('manager', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ApprovalDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      }

      const result = await decideRequisition(
        req.params.requisitionId,
        parsed.data,
        req.user
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
