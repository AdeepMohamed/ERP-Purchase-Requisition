import { PrismaClient, RequisitionStatus, POStatus } from '@prisma/client';
import { ApprovalDecisionInput } from '../../utils/validate';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { PO_NUMBER_PREFIX } from '../../config/constants';

const prisma = new PrismaClient();

// Helper: generate a sequential PO number "PO-YYYYMMDD-XXXX"
async function generatePoNumber(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.purchaseOrder.count();
  const seq = String(count + 1).padStart(4, '0');
  return `${PO_NUMBER_PREFIX}-${today}-${seq}`;
}

export async function decideRequisition(
  requisitionId: string,
  input: ApprovalDecisionInput,
  approver: Express.Request['user']
) {
  if (!approver) throw new ForbiddenError();

  const requisition = await prisma.requisition.findUnique({
    where: { id: requisitionId },
    include: { requester: true },
  });

  if (!requisition) throw new NotFoundError('Requisition');

  // ── Business Rule: must be in an approvable state ─────────────────────────
  const approvableStates: RequisitionStatus[] = [
    RequisitionStatus.pending,
    RequisitionStatus.pending_2nd,
  ];
  if (!approvableStates.includes(requisition.status)) {
    throw new ValidationError(
      `Requisition is in '${requisition.status}' state and cannot be acted on`
    );
  }

  // ── Business Rule: manager cannot approve their own requisition ───────────
  // Enforced server-side even if the UI hides the button
  if (approver.id === requisition.requesterId) {
    throw new ForbiddenError('A manager cannot approve their own requisition');
  }

  // ── Business Rule: 2nd-level approval requires a dept head ────────────────
  if (requisition.status === RequisitionStatus.pending_2nd && !approver.isDeptHead) {
    throw new ForbiddenError(
      'This requisition requires a department head (2nd-level) approval'
    );
  }

  const newStatus =
    input.decision === 'approved'
      ? RequisitionStatus.approved
      : RequisitionStatus.rejected;

  // Transact: update requisition + create approval record + audit log (+ PO if approved)
  const [updatedRequisition] = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const updated = await tx.requisition.update({
      where: { id: requisitionId },
      data: { status: newStatus, decidedAt: new Date() },
    });

    await tx.approval.create({
      data: {
        requisitionId,
        approverId: approver.id,
        decision: input.decision,
        comment: input.comment,
      },
    });

    // Audit log — immutable record of who decided what
    await tx.auditLog.create({
      data: {
        entityType: 'requisition',
        entityId: requisitionId,
        action: input.decision, // "approved" | "rejected"
        actorId: approver.id,
        metadata: {
          comment: input.comment,
          previousStatus: requisition.status,
          newStatus,
        },
      },
    });

    // ── Auto-generate PO on approval ─────────────────────────────────────────
    // Business rule: PO only created when requisition is fully approved
    if (input.decision === 'approved') {
      const poNumber = await generatePoNumber();
      await tx.purchaseOrder.create({
        data: {
          requisitionId,
          poNumber,
          status: POStatus.draft,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'purchase_order',
          entityId: requisitionId, // Will be updated after PO is created; acceptable for audit trail
          action: 'created',
          actorId: approver.id,
          metadata: { poNumber, triggeredBy: 'approval' },
        },
      });
    }

    return [updated];
  });

  return updatedRequisition;
}
