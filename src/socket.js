import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_SERVER_URL || undefined, {
  autoConnect: true,
});

export function emitWithResponse(event, payload = {}) {
  return new Promise((resolve) => {
    socket.timeout(5000).emit(event, payload, (error, response) => {
      if (error) {
        resolve({
          ok: false,
          message: "O servidor demorou para responder. Tente novamente.",
        });
        return;
      }

      resolve(response);
    });
  });
}
