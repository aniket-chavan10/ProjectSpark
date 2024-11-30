const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getSuperadminByEmail } = require('../models/superAdminModel');
const { getAllVillagesFromDB, updateVillageStatus } = require('../models/villageModel');
const db = require('../config/database');
const {createAdmin} = require('../models/adminModel');
const { getVillageById } = require('../models/villageModel');
const { createTeam } = require('../models/teamModel');

// Superadmin: Login method
const loginSuperadmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Check if superadmin exists by email
        const superadmin = await getSuperadminByEmail(email);
        if (!superadmin) {
            return res.status(401).json({ message: 'Superadmin not found or incorrect credentials.' });
        }

        // Compare the hashed password with the stored one
        const isMatch = await bcrypt.compare(password, superadmin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }

        // Generate a JWT token
        const token = jwt.sign(
            { id: superadmin.id, email: superadmin.email, role: superadmin.role },
            process.env.JWT_SECRET,  // Make sure to set JWT_SECRET in your .env file
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,  // Send token as part of the response
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Superadmin: View all village requests (pending and approved)
const getAllVillageRequests = async (req, res) => {
    try {
        const villages = await getAllVillagesFromDB();

        // Separate pending and approved villages
        const pendingVillages = villages.filter(village => village.status === 'Pending');
        const approvedVillages = villages.filter(village => village.status === 'Approved');

        res.status(200).json({
            pending: pendingVillages,
            approved: approvedVillages
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching villages.' });
    }
};




const approveVillageRequest = async (req, res) => {
    const connection = await db.getConnection(); // Use connection for transaction
    try {
        const { id } = req.params;

        // Start transaction
        await connection.beginTransaction();

        // Fetch the village details
        const village = await getVillageById(id);
        if (!village) {
            return res.status(404).json({ message: 'Village request not found.' });
        }

        if (village.status === 'Approved') {
            return res.status(400).json({ message: 'Village request is already approved.' });
        }

        // Generate password as `admin_<village_name>`
        const rawPassword = `admin_${village.village_name.replace(/\s+/g, '').toLowerCase()}`; // Remove spaces and lowercase
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // Create admin
        const adminData = {
            admin_name: village.admin_name,
            email: village.email,
            phone: village.phone,
            team_name: village.team_name,
            password: hashedPassword, // Pass hashed password
        };
        const adminId = await createAdmin(adminData, connection);

        // Create team
        const teamData = {
            village_id: village.id,
            admin_id: adminId, // Use the created admin ID
            team_name: village.team_name,
            logo_image: null,
            banner_image: null,
        };
        await createTeam(teamData, connection);

        // Update village status after all operations are successful
        await updateVillageStatus(id, 'Approved', connection);

        // Commit transaction
        await connection.commit();

        res.status(200).json({
            message: 'Village request approved, admin created, and team created successfully.',
            admin: {
                email: adminData.email,
                rawPassword, // Return the raw password for reference (can be logged securely or sent to admin)
            },
        });
    } catch (error) {
        console.error(error);
        if (connection) await connection.rollback(); // Rollback on error
        res.status(500).json({ message: 'Server error while processing village request.' });
    } finally {
        if (connection) connection.release(); // Release connection
    }
};





// Superadmin: Reject a village request
const rejectVillageRequest = async (req, res) => {
    try {
        const { villageId } = req.params;

        // Update the village status to 'Rejected'
        await updateVillageStatus(villageId, 'Rejected');

        res.status(200).json({
            message: 'Village request rejected successfully.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while rejecting village request.' });
    }
};

// Update the team with the admin_id after creating the admin
const updateTeamAdmin = async (teamId, adminId) => {
    const query = 'UPDATE teams SET admin_id = ? WHERE id = ?';
    const values = [adminId, teamId];
    await db.execute(query, values);
};

module.exports = {
    loginSuperadmin,
    getAllVillageRequests,
    approveVillageRequest,
    rejectVillageRequest
};
