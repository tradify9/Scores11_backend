import { Server } from 'socket.io';
import config from './env.js';

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join-match', (matchId) => {
      if (matchId) {
        socket.join(`match:${matchId}`);
        console.log(`📺 Socket ${socket.id} joined match:${matchId}`);
      }
    });

    socket.on('leave-match', (matchId) => {
      if (matchId) {
        socket.leave(`match:${matchId}`);
        console.log(`👋 Socket ${socket.id} left match:${matchId}`);
      }
    });

    socket.on('join-tournament', (tournamentId) => {
      if (tournamentId) {
        socket.join(`tournament:${tournamentId}`);
      }
    });

    socket.on('authenticate', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToMatch = (matchId, event, data) => {
  if (io && matchId) {
    const room = `match:${matchId}`;
    io.to(room).emit(event, data);
    console.log(`📤 Emitted ${event} to ${room} (${Object.keys(io.sockets.adapter.rooms[room] || {}).length} clients)`);
  }
};

// Live scoring specific events
export const emitTossUpdate = (matchId, tossData) => emitToMatch(matchId, 'tossUpdate', tossData);
export const emitInningsStart = (matchId, inningsData) => emitToMatch(matchId, 'inningsStart', inningsData);
export const emitInningsEnd = (matchId, inningsData) => emitToMatch(matchId, 'inningsEnd', inningsData);
export const emitWicketFall = (matchId, wicketData) => emitToMatch(matchId, 'wicketFall', wicketData);
export const emitBoundary = (matchId, boundaryData) => emitToMatch(matchId, 'boundary', boundaryData);

export const emitToTournament = (tournamentId, event, data) => {
  if (io && tournamentId) {
    io.to(`tournament:${tournamentId}`).emit(event, data);
  }
};

export const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  if (io) io.emit(event, data);
};

export default initializeSocket;