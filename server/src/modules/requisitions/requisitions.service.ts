import { PrismaClient, RequisitionStatus } from '@prisma/client';
import { CreateRequisitionInput } from '../../utils/validate';
import { APPROVAL_THRESHOLD_PAISE } from '../../config/constants';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

const prisma = new PrismaClient();

// Row-level auth filter — employees see only their own; managers see their dept; admins see all
function buildWhereClause(user: Express.Request['user']) {
  if (!user) return {};
  if (user.role === 'admin') return {};
  if (user.role === 'manager') return { department: user.department };
  return { requesterId: user.id }; // employee
}

export async function listRequisitions(user: Express.Request['user']) {
  return prisma.requisition.findMany({
    where: buildWhereClause(user),
    include: {
      requester: { select: { id: true, name: true, email: true, department: true } },
      approval: { include: { approver: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getRequisition(id: string, user: Express.Request['user']) {
  const req = await prisma.requisition.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true, department: true } },
      approval: { include: { approver: { select: { id: true, name: true } } } },
      purchaseOrder: true,
    },
  });

  if (!req) throw new NotFoundError('Requisition');

  // Row-level authorization: employees can only view their own requisitions
  if (user?.role === 'employee' && req.requesterId !== user.id) {
    throw new ForbiddenError('You can only view your own requisitions');
  }
  // Managers can only view their department's requisitions
  if (user?.role === 'manager' && req.department !== user.department) {
    throw new ForbiddenError('You can only view requisitions from your department');
  }

  return req;
}

export async function createRequisition(
  input: CreateRequisitionInput,
  user: Express.Request['user']
) {
  if (!user) throw new ForbiddenError();

  // Business rule: amounts above threshold start in pending_2nd status, routed to dept head
  const initialStatus: RequisitionStatus =
    input.estimatedCostPaise >= APPROVAL_THRESHOLD_PAISE
      ? RequisitionStatus.pending_2nd
      : RequisitionStatus.pending;

  const requisition = await prisma.requisition.create({
    data: {
      requesterId: user.id,
      itemName: input.itemName,
      quantity: input.quantity,
      justification: input.justification,
      urgency: input.urgency as any,
      estimatedCostPaise: input.estimatedCostPaise,
      status: initialStatus,
      department: user.department,
    },
  });

  // Immutable audit log entry for submission
  await prisma.auditLog.create({
    data: {
      entityType: 'requisition',
      entityId: requisition.id,
      action: 'submitted',
      actorId: user.id,
      metadata: {
        status: initialStatus,
        ...(initialStatus === RequisitionStatus.pending_2nd && {
          reason: `Amount ₹${(input.estimatedCostPaise / 100).toFixed(2)} exceeds threshold`,
        }),
      },
    },
  });

  return requisition;
}
