import 'dotenv/config';
import http from 'http';
import app from './app';
import { initializeSockets } from './sockets/handlers';

const PORT = process.env.PORT ?? 4000;

const httpServer = http.createServer(app);

// Attach Socket.IO to the same HTTP server (shares port with Express)
initializeSockets(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 ERP Server running on http://localhost:${PORT}`);
  console.log(`   WebSocket ready on ws://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
