require('dotenv').config();
const mysql = require('mysql2/promise');

// Utility to validate env vars
const validateEnvVars = () => {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

validateEnvVars();

console.log('DB Config:', {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: !!process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME
});


const createDatabasePool = () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
      charset: process.env.DB_CHARSET || 'utf8mb4'
    });

    console.log('✅ Database connection pool created successfully.');
    return pool;
  } catch (err) {
    console.error('❌ Error creating DB connection pool:', err.message);
    process.exit(1);
  }
};

const db = createDatabasePool();
module.exports = db;
