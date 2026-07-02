import { z } from 'zod';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Requisition ───────────────────────────────────────────────────────────────

export const CreateRequisitionSchema = z.object({
  itemName: z.string().min(2, 'Item name must be at least 2 characters').max(200),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10_000),
  justification: z.string().min(10, 'Justification must be at least 10 characters').max(2000),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  // Client sends paise (integer); validated server-side — never trust client floats
  estimatedCostPaise: z.number().int().min(1, 'Estimated cost must be greater than 0'),
});

// ── Approval ──────────────────────────────────────────────────────────────────

export const ApprovalDecisionSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    // Comment is optional for approvals but REQUIRED for rejections — see refine below
    comment: z.string().max(2000).optional(),
  })
  .refine(
    // Business rule: rejection without a comment is blocked at the schema level
    (data) => data.decision !== 'rejected' || (!!data.comment && data.comment.trim().length >= 5),
    { message: 'A comment (min 5 characters) is required when rejecting a requisition', path: ['comment'] }
  );

// ── Purchase Order ────────────────────────────────────────────────────────────

export const UpdatePOStatusSchema = z.object({
  status: z.enum(['sent', 'received', 'cancelled']),
  supplier: z.string().max(200).optional(),
  // unitCostPaise required when moving to "sent" — enforced in service layer
  unitCostPaise: z.number().int().min(0).optional(),
});

// ── Inventory ─────────────────────────────────────────────────────────────────

export const CreateInventoryItemSchema = z.object({
  name: z.string().min(2).max(200),
  sku: z.string().min(2).max(50),
  quantityOnHand: z.number().int().min(0, 'Quantity on hand cannot be negative'),
  reorderThreshold: z.number().int().min(0),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

// ── Types inferred from Zod schemas (used in controllers) ────────────────────

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateRequisitionInput = z.infer<typeof CreateRequisitionSchema>;
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;
export type UpdatePOStatusInput = z.infer<typeof UpdatePOStatusSchema>;
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;
