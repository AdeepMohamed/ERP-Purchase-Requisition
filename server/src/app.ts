import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { AppError } from './utils/errors';

// Route modules
import authRoutes from './modules/auth/auth.routes';
import requisitionsRoutes from './modules/requisitions/requisitions.routes';
import approvalsRoutes from './modules/approvals/approvals.routes';
import purchaseOrdersRoutes from './modules/purchase-orders/purchase-orders.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import auditLogRoutes from './modules/audit-log/audit-log.routes';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/requisitions', requisitionsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-log', auditLogRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
// Maps AppError subclasses to correct HTTP status codes; never leaks stack traces in production

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  // Log unexpected errors server-side (but don't expose internals to client)
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
