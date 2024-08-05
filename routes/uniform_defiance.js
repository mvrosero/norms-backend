const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();
const multer = require('multer'); 
const path = require('path');

/*multer setup - define storage and file filter*/
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ storage: storage });


/*post: uniform defiance*/
router.post('/create-uniformdefiance', upload.single('photo_video_file'), async (req, res) => {
    try {
        const { student_idnumber, violation_nature, submitted_by } = req.body;
        const photo_video_filename = req.file.filename; /*retrieve uploaded file name*/

        /*check if any required fields are missing*/
        if (!student_idnumber || !violation_nature || !photo_video_filename || !submitted_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertDefianceQuery = 'INSERT INTO uniform_defiance (student_idnumber, violation_nature, photo_video_filename, created_at, submitted_by) VALUES (?, ?, ?, ?, ?)';

        console.log('Inserting into database:', {
            student_idnumber,
            violation_nature,
            photo_video_filename,
            created_at: currentTimestamp,
            submitted_by
        });

        await db.promise().execute(insertDefianceQuery, [student_idnumber, violation_nature, photo_video_filename, currentTimestamp, submitted_by]);

        res.status(201).json({ message: 'Uniform defiance recorded successfully' });
    } catch (error) {
        console.error('Error registering uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 uniform_defiance*/
router.get('/uniform_defiance/:id', (req, res) => {
    let slip_id = req.params.id;

    if (!slip_id) {
        return res.status(400).send({ error: true, message: 'Please provide slip_id' });
    }

    try {
        db.query('SELECT slip_id, student_idnumber, violation_nature, photo_video_filename, status, created_at, submitted_by FROM uniform_defiance WHERE slip_id = ?', [slip_id], (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiance:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                if (result.length > 0) {
                    const { photo_video_filename } = result[0];
                    const fileExtension = photo_video_filename.split('.').pop().toLowerCase();

                    if (fileExtension === 'mp4' || fileExtension === 'avi' || fileExtension === 'mov') {
                        // Return video file
                        const filePath = path.join(__dirname, `../uploads/${photo_video_filename}`);
                        res.sendFile(filePath);
                    } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png' || fileExtension === 'gif') {
                        // Return image file
                        const filePath = path.join(__dirname, `../uploads/${photo_video_filename}`);
                        res.sendFile(filePath);
                    } else {
                        res.status(400).json({ message: 'Unsupported file format' });
                    }
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


/*get: uniform_defiances*/
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


/*get: 1 uniform_defiance (student_idnumber)*/
router.get('/uniform_defiances/:student_idnumber', (req, res) => {
    let student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        db.query(`
            SELECT 
                slip_id,
                student_idnumber,
                violation_nature,
                photo_video_filename,
                status,
                created_at,
                submitted_by
            FROM 
                uniform_defiance
            WHERE 
                student_idnumber = ?`, student_idnumber, (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiance records:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                if (result.length === 0) {
                    // No records found for the student_idnumber
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







/*put: uniform_defiance*/
router.put('/uniform_defiance/:id', async (req, res) => {
    try {
        const slip_id = req.params.id;
        const { status } = req.body;

        /*validate required fields*/
        if (!slip_id || !status) {
            return res.status(400).json({ error: 'Please provide all required details' });
        }

        /*perform database update*/
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