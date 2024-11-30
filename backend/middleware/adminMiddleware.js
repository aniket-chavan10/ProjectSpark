const jwt = require('jsonwebtoken');

const verifyAdminToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token

    if (!token) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use the same secret
        req.admin = decoded; // Attach admin info to the request
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = verifyAdminToken;
