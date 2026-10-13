import { Server } from "socket.io";
import config from "./env.js";

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.cors.origin || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Clients send either a bare id or { matchId | tournamentId | streamId }.
    const roomId = (payload, key) => {
      const id = payload && typeof payload === 'object' ? payload[key] : payload;
      return id ? id.toString() : '';
    };

    // Web uses kebab-case events, the mobile app uses camelCase/snake_case.
    const joinMatch = (payload) => {
      const matchId = roomId(payload, 'matchId');
      if (matchId) {
        socket.join(`match:${matchId}`);
        console.log(`📺 Socket ${socket.id} joined match:${matchId}`);
      }
    };
    const leaveMatch = (payload) => {
      const matchId = roomId(payload, 'matchId');
      if (matchId) {
        socket.leave(`match:${matchId}`);
        console.log(`👋 Socket ${socket.id} left match:${matchId}`);
      }
    };
    socket.on('join-match', joinMatch);
    socket.on('joinMatch', joinMatch);
    socket.on('leave-match', leaveMatch);
    socket.on('leaveMatch', leaveMatch);

    const joinTournament = (payload) => {
      const tournamentId = roomId(payload, 'tournamentId');
      if (tournamentId) socket.join(`tournament:${tournamentId}`);
    };
    const leaveTournament = (payload) => {
      const tournamentId = roomId(payload, 'tournamentId');
      if (tournamentId) socket.leave(`tournament:${tournamentId}`);
    };
    socket.on('join-tournament', joinTournament);
    socket.on('join_tournament', joinTournament);
    socket.on('leave-tournament', leaveTournament);
    socket.on('leave_tournament', leaveTournament);

    // Live stream rooms: liveStream.service emits chat/viewer events to io.to(streamId).
    socket.on('joinStream', (payload) => {
      const streamId = roomId(payload, 'streamId');
      if (streamId) socket.join(streamId);
    });
    socket.on('leaveStream', (payload) => {
      const streamId = roomId(payload, 'streamId');
      if (streamId) socket.leave(streamId);
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

// ✅ Safe getter
export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToMatch = (matchId, event, data) => {
  if (io && matchId) {
    const room = `match:${matchId}`;
    io.to(room).emit(event, data);
    console.log(`📤 Emitted ${event} to ${room} (${io.sockets.adapter.rooms.get(room)?.size || 0} clients)`);
  }
};

// Live scoring specific events
export const emitTossUpdate = (matchId, tossData) => emitToMatch(matchId, 'tossUpdate', tossData);
export const emitInningsStart = (matchId, inningsData) => emitToMatch(matchId, 'inningsStart', inningsData);
export const emitInningsEnd = (matchId, inningsData) => emitToMatch(matchId, 'inningsEnd', inningsData);
export const emitWicketFall = (matchId, wicketData) => emitToMatch(matchId, 'wicketFall', wicketData);
export const emitBoundary = (matchId, boundaryData) => emitToMatch(matchId, 'boundary', boundaryData);

export const emitLineupsUpdate = (matchId, lineups) => emitToMatch(matchId, 'lineupsUpdate', lineups);
export const emitTurnUpdate = (matchId, turnData) => emitToMatch(matchId, 'turnUpdate', turnData);

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