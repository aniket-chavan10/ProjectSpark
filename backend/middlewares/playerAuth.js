const jwt = require('jsonwebtoken');

const verifyPlayerToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', ''); // Extract token from Authorization header

    if (!token) {
        return res.status(400).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token

        // Ensure the token corresponds to a player
        if (decoded.role !== 'player') {
            return res.status(403).json({ error: 'Access denied: not a player' });
        }

        // Attach decoded player info to request object
        req.player = decoded;

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Invalid token:', error);
        res.status(400).json({ error: 'Invalid token' });
    }
};

module.exports = verifyPlayerToken;
