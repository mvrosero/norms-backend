const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer'); 
const path = require('path');
const db = require('./db'); // Import your database connection

const router = express.Router();

/* multer setup - define storage and file filter */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ storage: storage });

// Route to change password and optionally upload a file
router.put('/change-password/:id', upload.single('profile_photo'), async (req, res) => {
    try {
        const user_id = req.params.id;
        const { current_password, new_password } = req.body;
        const profile_photo_filename = req.file ? req.file.filename : null; // Get uploaded file name

        // Validate required fields
        if (!user_id || !current_password || !new_password) {
            return res.status(400).json({ error: 'Please provide all required details' });
        }

        // Fetch the current user from the database
        db.query('SELECT password FROM user WHERE user_id = ?', [user_id], async (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = results[0];
            
            // Check if the current password matches
            const isMatch = await bcrypt.compare(current_password, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            // Hash the new password
            const hashedPassword = await bcrypt.hash(new_password, 10);

            // Update the user's password and optionally update the profile photo in the database
            const updateQuery = 'UPDATE user SET password = ?, profile_photo_filename = ? WHERE user_id = ?';
            db.query(updateQuery, [hashedPassword, profile_photo_filename, user_id], (err) => {
                if (err) {
                    console.error('Error updating password:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                res.status(200).json({ message: 'Password updated successfully' });
            });
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
