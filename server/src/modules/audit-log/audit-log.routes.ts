import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const prisma = new PrismaClient();

/**
 * Audit log routes — READ ONLY.
 * There are intentionally NO PUT, PATCH, or DELETE routes here.
 * This is an insert-only log by design (mirrors real financial-audit requirements).
 * New entries are created only by service-layer operations — never directly via API.
 */

// GET /api/audit-log — admin sees all; manager sees their dept
router.get(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const whereClause =
        user.role === 'admin' ? {} : { actor: { department: user.department } };

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          actor: { select: { id: true, name: true, role: true, department: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 200, // Cap to prevent huge responses; pagination can be added later
      });

      res.json(logs);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
