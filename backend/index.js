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
    methods: ['GET', 'POST','PUT','DELETE'],
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

const playersRoute = require('./routes/playersRoute');
app.use('/api/admin/player', playersRoute);



app.get('/protected', verifyToken, (req, res) => {
    res.send('This is a protected route. Only accessible if authenticated.');
});

// Test MySQL connection on server start
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to MySQL database');
    }
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
