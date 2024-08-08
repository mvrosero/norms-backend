const express = require('express');
const multer = require('multer'); 
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../app/configuration/database'); // Ensure this is properly imported
const config = require('../app/middleware/config');
const secretKey = config.secretKey; // Ensure secretKey is correctly imported from config

const router = express.Router();

/* Multer setup - define storage */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ storage: storage });

/* Middleware to authenticate user and extract identifier */
function authenticateUser(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized - Invalid token' });
        }

        // Attach the identifier to the request object
        req.identifier = decoded.employee_idnumber || decoded.student_idnumber;
        next();
    });
}

/* Route to upload a profile photo */
router.put('/user/photo', authenticateUser, upload.single('profile_photo'), async (req, res) => {
    try {
        const identifier = req.identifier; // This could be either employee_idnumber or student_idnumber
        const profile_photo_filename = req.file ? req.file.filename : null;

        if (!profile_photo_filename) {
            return res.status(400).json({ error: 'No profile photo provided' });
        }

        if (!identifier) {
            return res.status(400).json({ error: 'User identifier is missing' });
        }

        // Update the profile photo based on the identifier
        const updateQuery = `
            UPDATE user 
            SET profile_photo_filename = ? 
            WHERE employee_idnumber = ? OR student_idnumber = ?
        `;
        db.query(updateQuery, [profile_photo_filename, identifier, identifier], (err) => {
            if (err) {
                console.error('Error updating profile photo:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.status(200).json({ message: 'Profile photo updated successfully' });
        });
    } catch (error) {
        console.error('Error updating profile photo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
