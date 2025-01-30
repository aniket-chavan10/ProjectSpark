require('dotenv').config();
const mysql = require('mysql2/promise');

// Utility function to validate required environment variables
const validateEnvVars = () => {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1); // Exit the application if any required variable is missing
  }
};

// Validate environment variables
validateEnvVars();

const createDatabasePool = () => {
  try {
    // Create and configure the MySQL connection pool
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: process.env.DB_CONNECTION_LIMIT || 10, // Default to 10 if not set
      queueLimit: process.env.DB_QUEUE_LIMIT || 0, // Default to no limit
      charset: process.env.DB_CHARSET || 'utf8mb4', // Default to UTF-8 with emoji support
    });

    console.log('Database connection pool created successfully.');
    return pool;
  } catch (error) {
    console.error('Error creating database connection pool:', error.message);
    process.exit(1); // Exit the application if pool creation fails
  }
};

// Create the database pool
const db = createDatabasePool();

// Export the pool object for use in your application
module.exports = db;
