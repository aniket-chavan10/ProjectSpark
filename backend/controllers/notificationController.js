const db = require("../dbconfigure");

const getNotifications = (req, res) => {
  const adminId = req.admin.id; // Admin ID extracted from the token

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required." });
  }

  const sql = `
    SELECT id, message, tournament_id, is_read, created_at 
    FROM notifications 
    WHERE recipient_admin_id = ? AND is_read = FALSE
    ORDER BY created_at DESC
  `;

  db.query(sql, [adminId], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching notifications.", details: err });
    }

    res.json(results);
  });
};

module.exports = {
  getNotifications,
};
