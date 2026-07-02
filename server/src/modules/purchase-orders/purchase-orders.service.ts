import { PrismaClient, POStatus, RequisitionStatus } from '@prisma/client';
import { UpdatePOStatusInput } from '../../utils/validate';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';

const prisma = new PrismaClient();

export async function listPurchaseOrders(user: Express.Request['user']) {
  if (!user) throw new ForbiddenError();

  // Row-level auth: managers see their dept's POs; admins see all
  const whereClause =
    user.role === 'admin'
      ? {}
      : {
          requisition: { department: user.department },
        };

  return prisma.purchaseOrder.findMany({
    where: whereClause,
    include: {
      requisition: {
        include: { requester: { select: { id: true, name: true, department: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updatePOStatus(
  poId: string,
  input: UpdatePOStatusInput,
  actor: Express.Request['user']
) {
  if (!actor) throw new ForbiddenError();

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      requisition: { select: { quantity: true, itemName: true, status: true } },
    },
  });

  if (!po) throw new NotFoundError('Purchase Order');

  // ── Business Rule: PO can only be updated if requisition is approved ───────
  if (po.requisition.status !== RequisitionStatus.approved) {
    throw new ValidationError('Cannot update a PO whose requisition is not approved');
  }

  // Validate "sent" requires unitCostPaise
  if (input.status === 'sent' && !input.unitCostPaise) {
    throw new ValidationError('Unit cost is required when marking a PO as sent');
  }

  const updateData: any = {
    status: input.status as POStatus,
    ...(input.supplier && { supplier: input.supplier }),
    ...(input.unitCostPaise && {
      unitCostPaise: input.unitCostPaise,
      totalCostPaise: input.unitCostPaise * po.requisition.quantity,
    }),
    ...(input.status === 'received' && { receivedAt: new Date() }),
  };

  const updatedPO = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: poId },
      data: updateData,
    });

    // ── Business Rule: mark as received → increment inventory ─────────────────
    // Guard against inventory going negative is in the DB CHECK constraint
    if (input.status === 'received') {
      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          // Match by item name (loose match for prototype — use SKU link in production)
          name: { contains: po.requisition.itemName, mode: 'insensitive' },
        },
      });

      if (inventoryItem) {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantityOnHand: { increment: po.requisition.quantity } },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        entityType: 'purchase_order',
        entityId: poId,
        action: `status_changed_to_${input.status}`,
        actorId: actor.id,
        metadata: { previousStatus: po.status, newStatus: input.status },
      },
    });

    return updated;
  });

  return updatedPO;
}
