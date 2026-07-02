/**
 * Seed script — populates the DB with realistic fake data for development.
 * All names/emails are fictional (erpdemo.local domain). No real PII.
 * Run with: npm run seed
 */

import { PrismaClient, Role, UrgencyLevel, RequisitionStatus, POStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper: hash a password with bcrypt (cost factor 10)
const hash = (pw: string) => bcrypt.hash(pw, 10);

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const [alice, bob, carol, dave, eve] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@erpdemo.local' },
      update: {},
      create: {
        name: 'Alice Sharma',
        email: 'alice@erpdemo.local',
        passwordHash: await hash('demo1234'),
        role: Role.employee,
        department: 'Engineering',
        isDeptHead: false,
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@erpdemo.local' },
      update: {},
      create: {
        name: 'Bob Verma',
        email: 'bob@erpdemo.local',
        passwordHash: await hash('demo1234'),
        role: Role.manager,
        department: 'Engineering',
        isDeptHead: false,
      },
    }),
    prisma.user.upsert({
      where: { email: 'carol@erpdemo.local' },
      update: {},
      create: {
        name: 'Carol Nair',
        email: 'carol@erpdemo.local',
        passwordHash: await hash('demo1234'),
        role: Role.manager,
        department: 'Engineering',
        isDeptHead: true, // Department head — handles 2nd-level approvals
      },
    }),
    prisma.user.upsert({
      where: { email: 'dave@erpdemo.local' },
      update: {},
      create: {
        name: 'Dave Pillai',
        email: 'dave@erpdemo.local',
        passwordHash: await hash('demo1234'),
        role: Role.admin,
        department: 'Administration',
        isDeptHead: false,
      },
    }),
    prisma.user.upsert({
      where: { email: 'eve@erpdemo.local' },
      update: {},
      create: {
        name: 'Eve Krishnan',
        email: 'eve@erpdemo.local',
        passwordHash: await hash('demo1234'),
        role: Role.employee,
        department: 'Engineering',
        isDeptHead: false,
      },
    }),
  ]);

  console.log(`✅ Created ${5} users`);

  // ── Inventory Items ────────────────────────────────────────────────────────
  const inventoryItems = await prisma.inventoryItem.createMany({
    data: [
      { name: 'Office Chair', sku: 'FURN-001', quantityOnHand: 12, reorderThreshold: 5 },
      { name: 'Laptop Stand', sku: 'TECH-001', quantityOnHand: 8, reorderThreshold: 5 },
      { name: 'HDMI Cable (2m)', sku: 'TECH-002', quantityOnHand: 3, reorderThreshold: 10 }, // Below threshold — should show alert
      { name: 'Whiteboard Markers (Pack)', sku: 'STAT-001', quantityOnHand: 2, reorderThreshold: 15 }, // Below threshold
      { name: 'USB Hub (7-port)', sku: 'TECH-003', quantityOnHand: 20, reorderThreshold: 5 },
      { name: 'A4 Paper (Ream)', sku: 'STAT-002', quantityOnHand: 50, reorderThreshold: 20 },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created inventory items`);

  // ── Requisitions (various statuses for demo) ───────────────────────────────
  const req1 = await prisma.requisition.upsert({
    where: { id: 'seed-req-001' },
    update: {},
    create: {
      id: 'seed-req-001',
      requesterId: alice.id,
      itemName: 'HDMI Cable (2m)',
      quantity: 5,
      justification: 'Team needs cables for the new monitor setup in conference room B.',
      urgency: UrgencyLevel.medium,
      estimatedCostPaise: 250000, // ₹2,500 — below threshold, single approval
      status: RequisitionStatus.pending,
      department: 'Engineering',
    },
  });

  const req2 = await prisma.requisition.upsert({
    where: { id: 'seed-req-002' },
    update: {},
    create: {
      id: 'seed-req-002',
      requesterId: eve.id,
      itemName: 'Ergonomic Keyboard',
      quantity: 3,
      justification: 'Current keyboards are causing repetitive strain issues.',
      urgency: UrgencyLevel.high,
      estimatedCostPaise: 3000000, // ₹30,000 — above ₹25,000 threshold, requires 2nd-level
      status: RequisitionStatus.pending_2nd,
      department: 'Engineering',
    },
  });

  const req3 = await prisma.requisition.upsert({
    where: { id: 'seed-req-003' },
    update: {},
    create: {
      id: 'seed-req-003',
      requesterId: alice.id,
      itemName: 'Office Chair',
      quantity: 2,
      justification: 'Two chairs broke last month.',
      urgency: UrgencyLevel.low,
      estimatedCostPaise: 1500000, // ₹15,000
      status: RequisitionStatus.approved,
      department: 'Engineering',
      decidedAt: new Date(),
    },
  });

  // Approval record for req3
  await prisma.approval.upsert({
    where: { id: 'seed-appr-001' },
    update: {},
    create: {
      id: 'seed-appr-001',
      requisitionId: req3.id,
      approverId: bob.id,
      decision: 'approved',
      comment: 'Approved. Please order from the usual supplier.',
    },
  });

  // Purchase Order for req3 (approved → auto-created)
  await prisma.purchaseOrder.upsert({
    where: { id: 'seed-po-001' },
    update: {},
    create: {
      id: 'seed-po-001',
      requisitionId: req3.id,
      poNumber: 'PO-20240702-0001',
      status: POStatus.sent,
      supplier: 'FurniturePro Supplies',
      unitCostPaise: 750000, // ₹7,500 per chair
      totalCostPaise: 1500000, // ₹15,000 total
    },
  });

  console.log(`✅ Created requisitions and purchase orders`);

  // ── Audit Log entries ──────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        entityType: 'requisition',
        entityId: req1.id,
        action: 'submitted',
        actorId: alice.id,
        metadata: { status: 'pending' },
      },
      {
        entityType: 'requisition',
        entityId: req2.id,
        action: 'submitted',
        actorId: eve.id,
        metadata: { status: 'pending_2nd', reason: 'Amount exceeds approval threshold' },
      },
      {
        entityType: 'requisition',
        entityId: req3.id,
        action: 'submitted',
        actorId: alice.id,
        metadata: { status: 'pending' },
      },
      {
        entityType: 'requisition',
        entityId: req3.id,
        action: 'approved',
        actorId: bob.id,
        metadata: { comment: 'Approved. Please order from the usual supplier.' },
      },
      {
        entityType: 'purchase_order',
        entityId: 'seed-po-001',
        action: 'created',
        actorId: dave.id,
        metadata: { poNumber: 'PO-20240702-0001', status: 'draft' },
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created audit log entries`);
  console.log('\n✨ Seed complete! Login credentials:');
  console.log('  alice@erpdemo.local  / demo1234  (employee)');
  console.log('  bob@erpdemo.local    / demo1234  (manager)');
  console.log('  carol@erpdemo.local  / demo1234  (manager, dept head)');
  console.log('  dave@erpdemo.local   / demo1234  (admin)');
  console.log('  eve@erpdemo.local    / demo1234  (employee)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
