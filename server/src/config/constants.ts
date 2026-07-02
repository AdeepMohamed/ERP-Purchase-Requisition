/**
 * Business constants — single source of truth.
 * Change a threshold here; it propagates everywhere automatically.
 */

// Requisitions with estimatedCostPaise >= this value require 2nd-level (dept head) approval
// ₹25,000 = 2,500,000 paise
export const APPROVAL_THRESHOLD_PAISE = 2_500_000;

// JWT expiry (used in auth module — references this rather than re-reading env)
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';

// PO number prefix format: "PO-YYYYMMDD-XXXX"
export const PO_NUMBER_PREFIX = 'PO';
