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

<<<<<<< HEAD
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ✅ Join match room
    socket.on("joinMatch", (matchId) => {
      if (!matchId) return;
      const room = `match:${matchId}`;
      socket.join(room);
      console.log(`➡️ ${socket.id} joined ${room}`);
    });

    // ✅ Leave match room
    socket.on("leaveMatch", (matchId) => {
      if (!matchId) return;
      const room = `match:${matchId}`;
      socket.leave(room);
      console.log(`⬅️ ${socket.id} left ${room}`);
    });

    // ✅ Tournament
    socket.on("joinTournament", (tournamentId) => {
      if (!tournamentId) return;
      socket.join(`tournament:${tournamentId}`);
    });

    // ✅ Stream
    socket.on("joinStream", (streamId) => {
      if (!streamId) return;
      socket.join(`stream:${streamId}`);
    });

    socket.on("leaveStream", (streamId) => {
      if (!streamId) return;
      socket.leave(`stream:${streamId}`);
    });

    // ✅ Agora signaling FIX (IMPORTANT)
    socket.on("user-published", (data) => {
      if (!data?.streamId) return;
      socket.to(`stream:${data.streamId}`).emit("user-published", data);
    });

    socket.on("user-unpublished", (data) => {
      if (!data?.streamId) return;
      socket.to(`stream:${data.streamId}`).emit("user-unpublished", data);
    });

    socket.on("user-joined", (data) => {
      if (!data?.streamId) return;
      socket.to(`stream:${data.streamId}`).emit("user-joined", data);
    });

    socket.on("user-left", (data) => {
      if (!data?.streamId) return;
      socket.to(`stream:${data.streamId}`).emit("user-left", data);
    });

    // ✅ Auth
    socket.on("authenticate", (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  console.log("🚀 Socket.io initialized");
=======
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
>>>>>>> f92d10cd7fdb1170e84082534229e18b6b3a7575
  return io;
};

// ✅ Safe getter
export const getIO = () => {
<<<<<<< HEAD
  if (!io) {
    console.warn("⚠️ Socket not initialized");
    return null;
  }
  return io;
};

// ✅ Emit helpers (SAFE VERSION)

export const emitToMatch = (matchId, event, data) => {
  if (!io || !matchId) return;
  io.to(`match:${matchId}`).emit(event, data);
=======
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToMatch = (matchId, event, data) => {
  if (io && matchId) {
    const room = `match:${matchId}`;
    io.to(room).emit(event, data);
    console.log(`📤 Emitted ${event} to ${room} (${Object.keys(io.sockets.adapter.rooms[room] || {}).length} clients)`);
  }
>>>>>>> f92d10cd7fdb1170e84082534229e18b6b3a7575
};

// Live scoring specific events
export const emitTossUpdate = (matchId, tossData) => emitToMatch(matchId, 'tossUpdate', tossData);
export const emitInningsStart = (matchId, inningsData) => emitToMatch(matchId, 'inningsStart', inningsData);
export const emitInningsEnd = (matchId, inningsData) => emitToMatch(matchId, 'inningsEnd', inningsData);
export const emitWicketFall = (matchId, wicketData) => emitToMatch(matchId, 'wicketFall', wicketData);
export const emitBoundary = (matchId, boundaryData) => emitToMatch(matchId, 'boundary', boundaryData);

export const emitToTournament = (tournamentId, event, data) => {
<<<<<<< HEAD
  if (!io || !tournamentId) return;
  io.to(`tournament:${tournamentId}`).emit(event, data);
};

export const emitToUser = (userId, event, data) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
=======
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
>>>>>>> f92d10cd7fdb1170e84082534229e18b6b3a7575
};

export default initializeSocket;