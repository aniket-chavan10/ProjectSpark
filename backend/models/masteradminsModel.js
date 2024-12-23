const db = require('../dbconfigure');
const bcrypt = require('bcryptjs');

// Function to add a new master admin
const addMasterAdmin = (adminData, callback) => {
    const { username, password, email_address } = adminData;

    // Hash the password before storing
    const hashedPassword = bcrypt.hashSync(password, 10);

    const sql = `
        INSERT INTO master_admins (username, password, email_address)
        VALUES (?, ?, ?)
    `;
    db.query(sql, [username, hashedPassword, email_address], (err, result) => {
        callback(err, result);
    });
};

// Function to authenticate master admin by username and password
const authenticateMasterAdmin = (username, password, callback) => {
  const sql = `SELECT * FROM master_admins WHERE username = ?`;

  db.query(sql, [username], (err, result) => {
      if (err) {
          return callback(err, null);  // Pass the error to the callback
      }

      if (result.length === 0) {
          // No user found with this username
          return callback(null, null);
      }

      const admin = result[0];  // Assuming there's only one result
      // Compare the plaintext password with the hashed password stored in the database
      bcrypt.compare(password, admin.password, (err, isMatch) => {
          if (err) {
              return callback(err, null);  // Pass the error to the callback
          }

          if (!isMatch) {
              // Passwords don't match
              return callback(null, null);
          }

          // Passwords match, return the admin data
          callback(null, admin);  // Return the admin data if the password matches
      });
  });
};

// Function to get all villages
const getAllVillages = (callback) => {
  const sql = `SELECT * FROM villages`;  // Modify according to your database structure
  db.query(sql, (err, result) => {
      callback(err, result);
  });
};

// Function to approve or reject a village request
const updateVillageStatus = (villageId, status, callback) => {
  const sql = `UPDATE villages SET status = ? WHERE id = ?`; // Adjust the query for your table structure
  db.query(sql, [status, villageId], (err, result) => {
      callback(err, result);
  });
};



module.exports = {
    addMasterAdmin,
    authenticateMasterAdmin,
    getAllVillages,
    updateVillageStatus
};
