import { PrismaClient } from '@prisma/client';
import { CreateInventoryItemInput, UpdateInventoryItemInput } from '../../utils/validate';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';

const prisma = new PrismaClient();

export async function listInventoryItems() {
  return prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
}

export async function createInventoryItem(input: CreateInventoryItemInput) {
  return prisma.inventoryItem.create({ data: input });
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
  actor: Express.Request['user']
) {
  if (!actor) throw new ForbiddenError();

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('Inventory item');

  // ── Business Rule: inventory cannot go negative ───────────────────────────
  // The DB CHECK constraint is the final guard, but we fail fast here with a helpful message
  const newQty =
    input.quantityOnHand !== undefined ? input.quantityOnHand : item.quantityOnHand;
  if (newQty < 0) {
    throw new ValidationError('Inventory quantity cannot go below zero');
  }

  return prisma.inventoryItem.update({ where: { id }, data: input });
}
