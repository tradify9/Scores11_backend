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
    console.log(`Socket connected: ${socket.id}`);

    // Join match room
    socket.on('joinMatch', (matchId) => {
      socket.join(`match:${matchId}`);
      console.log(`Socket ${socket.id} joined match:${matchId}`);
    });

    // Leave match room
    socket.on('leaveMatch', (matchId) => {
      socket.leave(`match:${matchId}`);
      console.log(`Socket ${socket.id} left match:${matchId}`);
    });

    // Join tournament room
    socket.on('joinTournament', (tournamentId) => {
      socket.join(`tournament:${tournamentId}`);
      console.log(`Socket ${socket.id} joined tournament:${tournamentId}`);
    });

    // Join live stream room
    socket.on('joinStream', (streamId) => {
      socket.join(`stream:${streamId}`);
      console.log(`Socket ${socket.id} joined stream:${streamId}`);
    });

    // Leave live stream room
    socket.on('leaveStream', (streamId) => {
      socket.leave(`stream:${streamId}`);
      console.log(`Socket ${socket.id} left stream:${streamId}`);
    });

    // Stream signaling (Agora)
    socket.on('user-published', (data) => {
      socket.to(data.streamId).emit('user-published', data);
    });

    socket.on('user-unpublished', (data) => {
      socket.to(data.streamId).emit('user-unpublished', data);
    });

    socket.on('user-joined', (data) => {
      socket.to(data.streamId).emit('user-joined', data);
    });

    socket.on('user-left', (data) => {
      socket.to(data.streamId).emit('user-left', data);
    });

    // User authentication
    socket.on('authenticate', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} authenticated as user:${userId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.io initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit events to specific rooms
export const emitToMatch = (matchId, event, data) => {
  if (io) {
    io.to(`match:${matchId}`).emit(event, data);
  }
};

export const emitToTournament = (tournamentId, event, data) => {
  if (io) {
    io.to(`tournament:${tournamentId}`).emit(event, data);
  }
};

export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export default initializeSocket;
