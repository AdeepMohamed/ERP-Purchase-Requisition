import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Initialize Socket.IO connection — called once after login.
 * Joins the correct rooms based on the user's role and department.
 */
export function connectSocket(user: { role: string; department: string }) {
  if (socket?.connected) return socket

  socket = io('/', {
    // Use the Vite proxy — same origin, avoids CORS in dev
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'], // Falls back to polling if WS unavailable
  })

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id)
    // Tell the server which rooms to join
    socket?.emit('join', { role: user.role, department: user.department })
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason)
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function getSocket() {
  return socket
}
