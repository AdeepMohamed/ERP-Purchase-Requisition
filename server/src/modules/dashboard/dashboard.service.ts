import { PrismaClient, RequisitionStatus, Prisma } from '@prisma/client';
import { ForbiddenError } from '../../utils/errors';

const prisma = new PrismaClient();

export async function getDashboardStats(user: Express.Request['user']) {
  if (!user) throw new ForbiddenError();

  const deptFilter =
    user.role === 'admin' ? {} : { department: user.department };

  const [
    pendingCount,
    lowStockItems,
    recentActivity,
    poStatusCounts,
  ] = await Promise.all([
    // Pending approvals count (scoped to role)
    prisma.requisition.count({
      where: {
        ...deptFilter,
        status: {
          in: [RequisitionStatus.pending, RequisitionStatus.pending_2nd],
        },
      },
    }),

    // Low-stock: items where quantityOnHand < reorderThreshold
    // Uses raw SQL because Prisma doesn't support cross-column comparisons in where clauses
    prisma.$queryRaw<{ id: string; name: string; sku: string; quantityOnHand: number; reorderThreshold: number }[]>(
      Prisma.sql`SELECT id, name, sku, "quantityOnHand", "reorderThreshold"
                 FROM inventory_items
                 WHERE "quantityOnHand" < "reorderThreshold"
                 ORDER BY "quantityOnHand" ASC LIMIT 5`
    ),

    // Recent activity from audit log (last 10 events, scoped to dept if not admin)
    prisma.auditLog.findMany({
      where:
        user.role === 'admin'
          ? {}
          : {
              actor: { department: user.department },
            },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    }),

    // PO status breakdown
    prisma.purchaseOrder.groupBy({
      by: ['status'],
      _count: { id: true },
      where:
        user.role === 'admin'
          ? {}
          : { requisition: { department: user.department } },
    }),
  ]);

  return {
    pendingApprovalsCount: pendingCount,
    lowStockItems,
    recentActivity,
    poStatusCounts: poStatusCounts.reduce(
      (acc: Record<string, number>, item: { status: string; _count: { id: number } }) => ({
        ...acc,
        [item.status]: item._count.id,
      }),
      {} as Record<string, number>
    ),
  };
}
