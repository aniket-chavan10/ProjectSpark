const nodemailer = require('nodemailer');
const crypto = require('crypto'); // To generate OTP
require('dotenv').config();
const { addVillageToDB, getAllVillagesFromDB, findVillageByEmailOrPhone } = require('../models/villageModel');

// Function to generate OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
};

// Send OTP via Email using Nodemailer
const sendEmailOTP = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your Gmail address
            pass: process.env.EMAIL_PASS, // Your Gmail password (or app-specific password)
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address
        to: email, // List of recipients
        subject: 'OTP Verification for Village Registration',
        text: `Your OTP code is: ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to email: ${email}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Error sending email OTP');
    }
};

const addVillage = async (req, res) => {
    try {
        const { village_name, team_name, admin_name, email, phone } = req.body;

        // Validate required fields
        if (!village_name || !team_name || !admin_name || !email) {
            return res.status(400).json({ message: 'Village name, team name, admin name, and email are required.' });
        }

        // Check if the email or phone already exists
        const existingVillage = await findVillageByEmailOrPhone(email, phone); // Pass both email and phone
        if (existingVillage[0].length > 0) {
            return res.status(409).json({
                message: 'Email or Phone is already registered.',
            });
        }

        // Generate OTP for Email
        const emailOTP = generateOTP();

        // Send OTP to email
        await sendEmailOTP(email, emailOTP);

        // Store OTP temporarily (could be in a cache, DB, or session)
        req.session.emailOTP = emailOTP;

        // Save village with "Pending" status
        const village = {
            village_name,
            team_name,
            admin_name,
            email,
            phone, // Ensure phone is saved as well
            status: 'Pending',
        };

        await addVillageToDB(village);
        res.status(201).json({
            message: 'Village registered successfully. Please verify your email with the OTP sent.',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};



// Verify OTP
const verifyOTP = (req, res) => {
    try {
        const { emailOTP } = req.body;

        // Check if the OTP matches
        if (emailOTP === req.session.emailOTP) {
            res.status(200).json({ message: 'OTP verified successfully. Your registration is complete.' });
        } else {
            res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

module.exports = {
    addVillage,
    verifyOTP,
    getAllVillagesFromDB,
};
