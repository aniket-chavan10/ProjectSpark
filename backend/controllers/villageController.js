// controllers/villageController.js

const { addVillage } = require('../models/villageModel'); // Import the model function

// Controller function to handle village registration
const registerVillage = async (req, res) => {
    const { village_name, team_name, admin_name, email_address, phone_number, status } = req.body;

    // Validate the input data
    if (!village_name || !team_name || !admin_name || !email_address || !phone_number) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const villageData = {
        village_name,
        team_name,
        admin_name,
        email_address,
        phone_number,
        status: status || 'pending', // Default status is 'pending'
    };

    try {
        // Call the model function to add the new village and wait for the result
        const result = await addVillage(villageData);

        // Respond with success message and village ID
        res.status(201).json({ message: 'Village registered successfully', villageId: result.insertId });
    } catch (err) {
        console.error('Error adding village:', err.message);
        return res.status(500).json({ error: 'Failed to register village' });
    }
};

module.exports = {
    registerVillage
};
