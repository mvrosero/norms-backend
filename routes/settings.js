const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();
const multer = require('multer'); 
const path = require('path');

/* Multer setup - define storage and file filter */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/profile_photo'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ storage: storage });

/* POST: Upload profile photo */
router.post('/upload-profile-photo/:user_id', upload.single('profile_photo_filename'), async (req, res) => {
    try {
        const { user_id } = req.params; // Get user_id from URL parameter
        const profile_photo_filename = req.file.filename; // Retrieve uploaded file name

        // Check if the file and user_id are present
        if (!user_id || !profile_photo_filename) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Update the user's profile photo filename in the database
        const updateProfilePhotoQuery = 'UPDATE user SET profile_photo_filename = ? WHERE user_id = ?';

        console.log('Updating database:', {
            profile_photo_filename,
            user_id
        });

        await db.promise().execute(updateProfilePhotoQuery, [profile_photo_filename, user_id]);

        res.status(200).json({ message: 'Profile photo uploaded successfully' });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
