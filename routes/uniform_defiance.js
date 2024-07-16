const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();
const multer = require('multer'); // For handling file uploads
const path = require('path');

// Multer setup - define storage and file filter
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Directory where files will be uploaded
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage: storage });

/* post: uniform defiance */
router.post('/create-uniformdefiance', upload.single('photo_video_file'), async (req, res) => {
    try {
        const { student_idnumber, violation_nature } = req.body;
        const photo_video_filename = req.file.filename; // Retrieve uploaded file name

        // Check if any required fields are missing
        if (!student_idnumber || !violation_nature || !photo_video_filename) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertDefianceQuery = 'INSERT INTO uniform_defiance (student_idnumber, violation_nature, photo_video_filename, created_at) VALUES (?, ?, ?, ?)';

        await db.promise().execute(insertDefianceQuery, [student_idnumber, violation_nature, photo_video_filename, currentTimestamp]);

        res.status(201).json({ message: 'Uniform defiance recorded successfully' });
    } catch (error) {
        console.error('Error registering uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* get: 1 uniform_defiance */
router.get('/uniform_defiance/:id', (req, res) => {
    let slip_id = req.params.id;

    if (!slip_id) {
        return res.status(400).send({ error: true, message: 'Please provide slip_id' });
    }

    try {
        db.query('SELECT slip_id, student_idnumber, violation_nature, photo_video_filename, status, created_at FROM uniform_defiance WHERE slip_id = ?', [slip_id], (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiance:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* get: uniform_defiances */
router.get('/uniform_defiances', (req, res) => {
    try {
        db.query('SELECT * FROM uniform_defiance WHERE slip_id IS NOT NULL', (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiances:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading uniform defiances:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* put: uniform_defiance */
router.put('/uniform_defiance/:id', async (req, res) => {
    try {
        const slip_id = req.params.id;
        const { status } = req.body;

        // Validate required fields
        if (!slip_id || !status) {
            return res.status(400).json({ error: 'Please provide all required details' });
        }

        // Perform database update
        db.query(
            'UPDATE uniform_defiance SET status = ? WHERE slip_id = ?', 
            [status, slip_id], 
            (err, result) => {
                if (err) {
                    console.error('Error updating uniform defiance:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                res.status(200).json({ message: 'Uniform defiance updated successfully', result });
            }
        );
    } catch (error) {
        console.error('Error updating uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
