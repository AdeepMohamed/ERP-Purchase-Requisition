import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer;

/**
 * Initialize Socket.IO — called once from server.ts.
 * Rooms are used so events are broadcast only to relevant users:
 *   - "managers" room: approval queue updates
 *   - "admins" room: all events
 *   - "dept:{name}" room: department-level updates
 */
export function initializeSockets(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Client sends its role/dept on connect to join the right rooms
    socket.on('join', (data: { role: string; department: string }) => {
      if (data.role === 'manager' || data.role === 'admin') {
        socket.join('managers');
      }
      if (data.role === 'admin') {
        socket.join('admins');
      }
      socket.join(`dept:${data.department}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// ── Event emitters — called from service modules after DB writes ──────────────

/** Notify managers that a new requisition needs approval */
export function emitNewRequisition(requisition: object) {
  io?.to('managers').emit('requisition:new', requisition);
}

/** Notify the requester's dept room that their requisition was decided */
export function emitRequisitionDecided(department: string, requisition: object) {
  io?.to(`dept:${department}`).emit('requisition:decided', requisition);
  io?.to('managers').emit('approval-queue:refresh'); // Refresh managers' queue
}

/** Broadcast inventory change to everyone (low-stock alerts) */
export function emitInventoryUpdate(item: object) {
  io?.emit('inventory:updated', item);
}

/** Broadcast dashboard stats refresh signal */
export function emitDashboardRefresh() {
  io?.emit('dashboard:refresh');
}
