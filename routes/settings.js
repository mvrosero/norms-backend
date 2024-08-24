const express = require('express');
const path = require('path');
const db = require('../app/configuration/database');
const multer = require('multer');
const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'uploads', 'profile_photo'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve static files from the 'uploads/profile_photo' directory
router.use('/uploads/profile_photo', express.static(path.join(__dirname, '..', 'uploads', 'profile_photo')));

// Endpoint to upload profile photo
router.post('/upload-profile-photo/:user_id', upload.single('profile_photo_filename'), async (req, res) => {
    try {
        const { user_id } = req.params;
        const profile_photo_filename = req.file.filename;

        if (!user_id || !profile_photo_filename) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const updateProfilePhotoQuery = 'UPDATE user SET profile_photo_filename = ? WHERE user_id = ?';
        await db.promise().execute(updateProfilePhotoQuery, [profile_photo_filename, user_id]);

        res.status(200).json({ message: 'Profile photo uploaded successfully' });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to retrieve profile photo filename
router.get('/profile-photo/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id' });
        }

        const getProfilePhotoQuery = 'SELECT profile_photo_filename FROM user WHERE user_id = ?';
        const [rows] = await db.promise().execute(getProfilePhotoQuery, [user_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const filename = rows[0].profile_photo_filename;
        res.status(200).json({ profile_photo_filename: filename });
    } catch (error) {
        console.error('Error retrieving profile photo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Endpoint to view the profile photo file
router.get('/view-profile-photo/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id' });
        }

        // Retrieve the filename of the profile photo from the database
        const getProfilePhotoQuery = 'SELECT profile_photo_filename FROM user WHERE user_id = ?';
        const [rows] = await db.promise().execute(getProfilePhotoQuery, [user_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const filename = rows[0].profile_photo_filename;

        // Serve the profile photo file
        const filePath = path.join(__dirname, '..', 'uploads', 'profile_photo', filename);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Error retrieving profile photo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;
