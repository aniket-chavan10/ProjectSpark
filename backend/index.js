const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); 
const socketIo = require('socket.io');
const db = require('./dbconfigure'); 
const verifyToken = require('./middlewares/authMiddleware');

dotenv.config();

const app = express();
const server = http.createServer(app); // Define server before using it

const io = new socketIo.Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // Allowed frontend origins
    methods: ["GET", "POST"],
    credentials: true,
  }
});

app.set("socketio", io); // Store io in app context for reuse

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join a match room based on matchNo, with safety check
  socket.on("join_match", ({ matchNo }) => {
    if (!matchNo) {
      console.warn(`Client ${socket.id} sent invalid matchNo`);
      return;
    }
    socket.join(`match_${matchNo}`);
    console.log(`Client ${socket.id} joined match ${matchNo}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

  // Catch-all error handler for socket
  socket.on("error", (err) => {
    console.error(`Socket error from client ${socket.id}:`, err);
  });
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5173'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
const villageRoute = require('./routes/villageRoute');
app.use('/api/village', villageRoute);

const masterAdminRoute = require('./routes/masteradminRoute');
app.use('/api/master-admin', masterAdminRoute);

const adminRoute = require('./routes/adminRoute');
app.use('/api/admin', adminRoute);

const teamRoute = require('./routes/teamRoute');
app.use('/api/team', teamRoute);

const tournamentRoute = require('./routes/tournamentRoute');
app.use('/api/tournament', tournamentRoute);

const tournamentParticipantsRoutes = require('./routes/tournamentParticipantsRoutes');
app.use('/api/admin/tournament', tournamentParticipantsRoutes);

const mastertournamentRoute = require('./routes/tentativeTournamentScheduleRoutes');
app.use('/api/master/tournament', mastertournamentRoute);

const matchRoute = require('./routes/matchRoute');
app.use('/api/match', matchRoute);

const liveMatchRoutes = require("./routes/liveMatchRoute");
app.use("/api/live", liveMatchRoutes);

const ballEventRoutes = require("./routes/ballEventRoutes");
app.use("/api/ball", ballEventRoutes);

const liveScoreRoutes = require("./routes/liveScoreRoutes");
app.use("/api/live/score", liveScoreRoutes);

const inningsRoutes = require("./routes/inningsRoutes");
app.use("/api/inning", inningsRoutes);

const { swaggerUi, specs } = require("./swaggerConfig");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Root endpoint
app.get('/', (req, res) => {
  res.send('Welcome to the backend of Project Spark!');
});

// Global error handling middleware for Express (optional, but recommended)
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = { app, io };
