import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { MemoryGame } from "./game.js";

const PORT = Number(process.env.PORT) || 3002;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || true;
const rooms = new Map();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", rooms: rooms.size });
});

function normalizeName(value) {
  const name = String(value ?? "").trim().slice(0, 20);

  if (name.length < 2) {
    throw new Error("Informe um nome com pelo menos 2 caracteres.");
  }

  return name;
}

function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  do {
    code = Array.from(
      { length: 5 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  } while (rooms.has(code));

  return code;
}

function emitRoomState(room) {
  room.players.forEach((player) => {
    if (!player.socketId) {
      return;
    }

    io.to(player.socketId).emit("game:state", room.publicState(player.id));
  });
}

function identifySocket(socket, room, player) {
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  socket.join(room.code);
}

function respond(callback, payload) {
  if (typeof callback === "function") {
    callback(payload);
  }
}

io.on("connection", (socket) => {
  socket.on("room:create", (payload, callback) => {
    try {
      const code = createRoomCode();
      const room = new MemoryGame(code);
      const player = room.addPlayer(normalizeName(payload?.name), socket.id);

      rooms.set(code, room);
      identifySocket(socket, room, player);
      respond(callback, { ok: true, code, token: player.token });
      emitRoomState(room);
    } catch (error) {
      respond(callback, { ok: false, message: error.message });
    }
  });

  socket.on("room:join", (payload, callback) => {
    try {
      const code = normalizeCode(payload?.code);
      const room = rooms.get(code);

      if (!room) {
        throw new Error("Sala não encontrada. Confira o código.");
      }

      const player = room.addPlayer(normalizeName(payload?.name), socket.id);
      identifySocket(socket, room, player);
      respond(callback, { ok: true, code, token: player.token });
      emitRoomState(room);
    } catch (error) {
      respond(callback, { ok: false, message: error.message });
    }
  });

  socket.on("room:resume", (payload, callback) => {
    try {
      const code = normalizeCode(payload?.code);
      const room = rooms.get(code);

      if (!room) {
        throw new Error("Esta sala não está mais disponível.");
      }

      const player = room.reconnectPlayer(payload?.token, socket.id);
      identifySocket(socket, room, player);
      respond(callback, { ok: true, code, token: player.token });
      emitRoomState(room);
    } catch (error) {
      respond(callback, { ok: false, message: error.message });
    }
  });

  socket.on("room:leave", (_payload, callback) => {
    const room = rooms.get(socket.data.roomCode);

    if (room) {
      room.disconnect(socket.id);
      socket.leave(room.code);
      emitRoomState(room);
    }

    socket.data.roomCode = null;
    socket.data.playerId = null;
    respond(callback, { ok: true });
  });

  socket.on("game:flip", (payload, callback) => {
    try {
      const room = rooms.get(socket.data.roomCode);

      if (!room) {
        throw new Error("Sala não encontrada.");
      }

      const shouldResolve = room.selectCard(
        socket.data.playerId,
        Number(payload?.cardIndex),
      );

      respond(callback, { ok: true });
      emitRoomState(room);

      if (shouldResolve) {
        setTimeout(() => {
          room.resolvePair();
          emitRoomState(room);
        }, 850);
      }
    } catch (error) {
      respond(callback, { ok: false, message: error.message });
    }
  });

  socket.on("game:restart", (_payload, callback) => {
    try {
      const room = rooms.get(socket.data.roomCode);

      if (!room) {
        throw new Error("Sala não encontrada.");
      }

      room.restart(socket.data.playerId);
      respond(callback, { ok: true });
      emitRoomState(room);
    } catch (error) {
      respond(callback, { ok: false, message: error.message });
    }
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomCode);

    if (!room) {
      return;
    }

    room.disconnect(socket.id);
    emitRoomState(room);
  });
});

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(currentDirectory, "../dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDirectory));
  app.get("{*splat}", (_request, response) => {
    response.sendFile(path.join(distDirectory, "index.html"));
  });
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor Memoji disponível na porta ${PORT}.`);
});
