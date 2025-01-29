const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();  
const db = require('./dbconfigure'); // Database connection
const verifyToken = require('./middlewares/authMiddleware')

dotenv.config(); // Load environment variables from .env

const app = express();

app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from your frontend
    methods: ['GET', 'POST','PUT','DELETE','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

// Middleware to parse JSON requests
app.use(express.json());
// Serve static files from the 'uploads' folder
app.use('/uploads', express.static('uploads'));



const villageRoute = require('./routes/villageRoute');
app.use('/api/village', villageRoute); // Mount the route on the '/api/villages' path

const masterAdminRoute = require('./routes/masteradminRoute');
app.use('/api/master-admin', masterAdminRoute);

const adminRoute = require('./routes/adminRoute');
app.use('/api/admin', adminRoute);

const teamRoute = require('./routes/teamRoute');
app.use('/api/team', teamRoute);

const playersRoute = require('./routes/playersRoute');
app.use('/api/admin/player', playersRoute);


const tournamentRoute = require('./routes/tournamentRoute');
app.use('/api/master-admin/tournament', tournamentRoute);



app.get('/protected', verifyToken, (req, res) => {
    res.send('This is a protected route. Only accessible if authenticated.');
});

db.getConnection()
  .then((connection) => {
    console.log('Connected to MySQL database');
    connection.release(); // Release the connection back to the pool
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });


// Root endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the backend of Project Spark!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
