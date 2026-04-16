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
  return io;
};

// ✅ Safe getter
export const getIO = () => {
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
};

export const emitToTournament = (tournamentId, event, data) => {
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
};

export default initializeSocket;