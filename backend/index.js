const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const session = require('express-session');


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key', // Secret key to sign the session ID cookie
    resave: false, // Whether to force session to be saved back to the session store
    saveUninitialized: false, // Whether to save uninitialized sessions
    cookie: { secure: false } // Set to true if you're using HTTPS
}));

// Routes
const villageRoute = require('./routes/villageRoute');
app.use('/api/village', villageRoute);

const superadminRoute = require('./routes/superadminRoutes');
app.use('/api/super-admin', superadminRoute);

const adminRoute = require('./routes/adminRoutes');
app.use('/api/admin', adminRoute);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
