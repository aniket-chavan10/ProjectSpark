const io = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected with socket ID", socket.id);

  // Join the room matching the matchId you will test (e.g., 8)
  const matchNoToJoin = 8;
  socket.emit("join_match", { matchNo: matchNoToJoin });
  console.log(`Joined match room: match_${matchNoToJoin}`);

  socket.on("scoreUpdate", (data) => {
    console.log("Received score update:", data);
  });
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
