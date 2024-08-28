const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer setup - define storage and file filter
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Post: uniform defiance
router.post('/create-uniformdefiance', upload.array('photo_video_files'), async (req, res) => {
    try {
        const { student_idnumber, violation_nature, submitted_by } = req.body;
        const files = req.files;

        // Retrieve filenames of all uploaded files
        const photo_video_filenames = files.map(file => file.filename).join(',');

        // Check if any required fields are missing
        if (!student_idnumber || !violation_nature || !photo_video_filenames || !submitted_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertDefianceQuery = 'INSERT INTO uniform_defiance (student_idnumber, violation_nature, photo_video_filenames, created_at, submitted_by) VALUES (?, ?, ?, ?, ?)';

        console.log('Inserting into database:', {
            student_idnumber,
            violation_nature,
            photo_video_filenames,
            created_at: currentTimestamp,
            submitted_by
        });

        await db.promise().execute(insertDefianceQuery, [student_idnumber, violation_nature, photo_video_filenames, currentTimestamp, submitted_by]);

        res.status(201).json({ message: 'Uniform defiance recorded successfully' });
    } catch (error) {
        console.error('Error registering uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* GET: 1 uniform_defiance */
router.get('/uniform_defiance/:id', (req, res) => {
    const slip_id = req.params.id;

    if (!slip_id) {
        return res.status(400).send({ error: true, message: 'Please provide slip_id' });
    }

    try {
        db.query('SELECT * FROM uniform_defiance WHERE slip_id = ?', [slip_id], (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiance:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                if (result.length > 0) {
                    const record = result[0];
                    res.status(200).json(record);
                } else {
                    res.status(404).json({ message: 'Record not found' });
                }
            }
        });
    } catch (error) {
        console.error('Error loading uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Get: uniform_defiances
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

/* GET: uniform_defiances (by student_idnumber) */
router.get('/uniform_defiances/:student_idnumber', (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        db.query('SELECT * FROM uniform_defiance WHERE student_idnumber = ?', [student_idnumber], (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiance records:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                if (result.length === 0) {
                    res.status(404).json({ message: 'No records found' });
                } else {
                    res.status(200).json(result);
                }
            }
        });
    } catch (error) {
        console.error('Error fetching uniform defiance records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Put: uniform_defiance
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
