// Live updates for one match. The server pushes the whole scoreboard after every ball.
import { io } from "socket.io-client";
import axiosInstance from "./axiosConfig";

// "http://localhost:3000/api" -> "http://localhost:3000"
export const apiOrigin = () => {
  try {
    return new URL(axiosInstance.defaults.baseURL).origin;
  } catch {
    return window.location.origin;
  }
};

/**
 * Join the room of a match and call onScoreboard with every update.
 * onStatus("connected" | "disconnected") lets a screen show a connection light.
 * Returns a function that leaves again.
 */
export function watchMatch(matchId, { onScoreboard, onStatus, onOverlay } = {}) {
  const socket = io(apiOrigin(), { transports: ["websocket", "polling"], reconnection: true });
  const join = () => socket.emit("join_match", { matchNo: matchId });

  socket.on("connect", () => {
    join();
    if (onStatus) onStatus("connected");
  });
  socket.on("disconnect", () => onStatus && onStatus("disconnected"));
  socket.on("scoreUpdate", (data) => onScoreboard && onScoreboard(data));
  // the operator changed what the broadcast screen shows
  socket.on("overlayUpdate", (state) => onOverlay && onOverlay(state));
  // after the innings changes the same payload shape arrives wrapped
  socket.on("innings_switched", (p) => p?.liveScoreData && onScoreboard && onScoreboard(p.liveScoreData));

  return () => socket.disconnect();
}
