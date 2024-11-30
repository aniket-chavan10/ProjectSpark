const bcrypt = require('bcrypt');
const mysql = require('mysql2');

// Database connection setup (replace with your credentials)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',  // Your DB username
    password: 'Chavan@123',  // Your DB password
    database: 'jaoli_association'
});

// Superadmin credentials
const superadminEmail = 'rajat@admin.com';
const superadminPassword = 'rajat@123'; // Plain password to be hashed

// Hash the password before storing it
bcrypt.hash(superadminPassword, 10, (err, hashedPassword) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    // SQL query to insert superadmin data into the users table
    const query = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
    const values = [superadminEmail, hashedPassword, 'superadmin'];

    // Insert the superadmin data into the database
    db.execute(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting superadmin:', err);
            return;
        }
        console.log('Superadmin created successfully:', result);
    });
});
