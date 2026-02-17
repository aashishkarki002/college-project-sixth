import { Server } from "socket.io";

let io = null;

export const initializeSocket = (server) => {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        exposedHeaders: ["Authorization"],
      },
    });

    io.on("connection", (socket) => {
      // Handle admin room joining
      socket.on("join:admin", (adminId) => {
        if (adminId) {
          const room = `admin:${adminId}`;
          socket.join(room);
        }
      });

      socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
      });
    });
  }
  return io;
};

export const getIO = () => {
  return io;
};
