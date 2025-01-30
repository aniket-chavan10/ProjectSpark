const db = require("../dbconfigure");

const getNotifications = async (req, res) => {
  const adminId = req.admin?.id; // Admin ID extracted from the token

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required." });
  }

  const sql = `
    SELECT id, message, tournament_id, is_read, created_at 
    FROM notifications 
    WHERE recipient_admin_id = ? AND is_read = FALSE
    ORDER BY created_at DESC
  `;

  try {
    const [results] = await db.query(sql, [adminId]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: "Error fetching notifications.",
      details: error.message,
    });
  }
};

module.exports = {
  getNotifications,
};
