const express = require('express');
const db = require('../app/configuration/database'); // Ensure this uses mysql2/promise
const router = express.Router();
const multer = require('multer');
const path = require('path');
const moment = require('moment-timezone');
const fs = require('fs');
const { parse } = require('json2csv');


// Multer setup - define storage and file filter
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpg|jpeg|png|gif|mp4|mov|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            return cb(new Error('Only photo and video files are allowed!'), false);
        }
    }
});


// Post: uniform defiance
router.post('/create-uniformdefiance', upload.array('photo_video_files'), async (req, res) => {
    try {
        const { student_idnumber, nature_id, submitted_by } = req.body;
        const files = req.files;

        // Retrieve filenames of all uploaded files
        const photo_video_filenames = files.map(file => file.filename).join(',');

        // Check if any required fields are missing
        if (!student_idnumber || !nature_id || !photo_video_filenames || !submitted_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get current time in Philippine time zone (Asia/Manila)
        const currentTimestamp = moment.tz("Asia/Manila").format('YYYY-MM-DD HH:mm:ss'); // Adjust to your desired timezone

        const insertDefianceQuery = `
            INSERT INTO uniform_defiance 
            (student_idnumber, photo_video_filenames, created_at, submitted_by, nature_id) 
            VALUES (?, ?, ?, ?, ?)`; 

        console.log('Inserting into database:', {
            student_idnumber,
            photo_video_filenames,
            currentTimestamp,
            submitted_by,
            nature_id
        });

        await db.promise().execute(insertDefianceQuery, [student_idnumber, photo_video_filenames, currentTimestamp, submitted_by, nature_id]);

        res.status(201).json({ message: 'Uniform defiance recorded successfully' });
    } catch (error) {
        console.error('Error registering uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* GET: 1 uniform_defiance */
router.get('/uniform_defiance/:id', async (req, res) => {
    const slip_id = req.params.id;

    if (!slip_id) {
        return res.status(400).send({ error: true, message: 'Please provide slip_id' });
    }

    try {
        const query = `
            SELECT 
                ud.*, 
                vn.nature_name, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name
            FROM uniform_defiance ud
            LEFT JOIN violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN user u ON ud.submitted_by = u.employee_idnumber
            WHERE ud.slip_id = ?`;

        const [result] = await db.promise().query(query, [slip_id]);

        if (result.length > 0) {
            const record = result[0];
            res.status(200).json(record);
        } else {
            res.status(404).json({ message: 'Record not found' });
        }
    } catch (error) {
        console.error('Error loading uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// GET: uniform_defiances
router.get('/uniform_defiances', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                ud.photo_video_filenames, 
                ud.status, 
                ud.created_at, 
                ud.updated_at, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name, 
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber;
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching uniform defiances:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// GET: All uniform_defiances except status 'Pending'
router.get('/uniform_defiances-not-pending', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                ud.photo_video_filenames, 
                ud.status, 
                ud.created_at, 
                ud.updated_at, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name, 
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.status != 'pending';
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching uniform defiances (not pending):', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// GET: All uniform_defiances with status 'Pending'
router.get('/uniform_defiances-pending', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                ud.photo_video_filenames, 
                ud.status, 
                ud.created_at, 
                ud.updated_at, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name, 
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.status = 'pending';
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching uniform defiances (pending):', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


/* GET: uniform_defiances (by student_idnumber) */
router.get('/uniform_defiances/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        const query = `
            SELECT 
                ud.*, 
                vn.nature_name, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name
            FROM 
                uniform_defiance ud
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.student_idnumber = ?`;
                

        const [result] = await db.promise().query(query, [student_idnumber]);

        if (result.length === 0) {
            res.status(404).json({ message: 'No records found' });
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        console.error('Error fetching uniform defiance records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




/* GET: uniform_defiances (by employee_idnumber for submitted_by) */
router.get('/uniform_defiances/submitted_by/:employee_idnumber', async (req, res) => {
    const employee_idnumber = req.params.employee_idnumber;

    if (!employee_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide employee_idnumber' });
    }

    try {
        const query = `
            SELECT 
                ud.*, 
                vn.nature_name, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name
            FROM 
                uniform_defiance ud
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.submitted_by = ?`;

        const [result] = await db.promise().query(query, [employee_idnumber]);

        if (result.length === 0) {
            res.status(404).json({ message: 'No records found for this employee' });
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        console.error('Error fetching uniform defiance records by submitted_by:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Put: uniform_defiance
router.put('/uniform_defiance/:id', async (req, res) => {
    try {
        const slip_id = req.params.id;
        const { status } = req.body;

        if (!slip_id || !status) {
            return res.status(400).json({ error: 'Please provide all required details' });
        }

        const [result] = await db.promise().query(
            'UPDATE uniform_defiance SET status = ? WHERE slip_id = ?', 
            [status, slip_id]
        );

        res.status(200).json({ message: 'Uniform defiance updated successfully', result });
    } catch (error) {
        console.error('Error updating uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




/* GET: Export all uniform_defiances except status 'Pending' to CSV */
router.get('/uniform_defiances-history/export', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                CONCAT(s.first_name, ' ', IFNULL(s.middle_name, ''), ' ', s.last_name) AS student_full_name, -- Student's full name
                ud.status, 
                DATE_FORMAT(ud.created_at, '%m/%d/%Y, %r') AS created_at, -- Formatted date
                DATE_FORMAT(ud.updated_at, '%m/%d/%Y, %r') AS updated_at, -- Formatted date
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS submitted_by_full_name, -- Submitted by full name
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber -- Submitted by employee details
            LEFT JOIN 
                user s ON ud.student_idnumber = s.student_idnumber -- Student details
            WHERE 
                ud.status != 'Pending';
        `);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        // Define CSV fields
        const fields = [
            { label: 'Slip ID', value: 'slip_id' },
            { label: 'Student ID Number', value: 'student_idnumber' },
            { label: 'Full Name', value: 'student_full_name' }, // Added Student's Full Name
            { label: 'Created At', value: 'created_at' },
            { label: 'Updated At', value: 'updated_at' },
            { label: 'Nature of Violation', value: 'nature_name' },
            { label: 'Status', value: 'status' },
            { label: 'Submitted By', value: 'submitted_by_full_name' }, // Renamed to reflect the field
        ];

        // Convert rows to CSV
        const csv = parse(rows, { fields });

        // Generate a temporary file path
        const filePath = path.join(__dirname, '..', 'exports', `uniform_defiances_history.csv`);

        // Write CSV to a file
        fs.writeFileSync(filePath, csv);

        // Send the file to the client
        res.download(filePath, `uniform_defiances_history.csv`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send({ error: 'Error exporting CSV file' });
            }

            // Delete the file after sending it
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting temporary file:', unlinkErr);
                }
            });
        });
    } catch (error) {
        console.error('Error exporting uniform defiance records (not pending):', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* GET: Export uniform defiance records to CSV */
router.get('/uniform_defiances/export/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        const query = `
            SELECT 
                ud.slip_id, 
                DATE_FORMAT(ud.created_at, '%m/%d/%Y, %r') AS created_at, -- Format as MM/DD/YYYY, hh:mm:ss AM/PM
                DATE_FORMAT(ud.updated_at, '%m/%d/%Y, %r') AS updated_at, -- Format as MM/DD/YYYY, hh:mm:ss AM/PM
                vn.nature_name, 
                ud.status, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name
            FROM 
                uniform_defiance ud
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.student_idnumber = ? AND
                ud.status = 'approved'`;

        const [result] = await db.promise().query(query, [student_idnumber]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        // Convert JSON result to CSV
        const fields = [
            { label: 'Slip ID', value: 'slip_id' },
            { label: 'Created At', value: 'created_at' }, 
            { label: 'Updated At', value: 'updated_at' }, 
            { label: 'Nature of Violation', value: 'nature_name' },
            { label: 'Status', value: 'status' },
            { label: 'Submitted By', value: 'full_name' },
        ];

        const csv = parse(result, { fields });

        // Generate a temporary file path
        const filePath = path.join(__dirname, '..', 'exports', `individual_uniform_defiances_${student_idnumber}.csv`);

        // Write CSV to a file
        fs.writeFileSync(filePath, csv);

        // Send the file to the client
        res.download(filePath, `individual_uniform_defiances_${student_idnumber}.csv`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send({ error: 'Error exporting CSV file' });
            }

            // Delete the file after sending it
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting temporary file:', unlinkErr);
                }
            });
        });
    } catch (error) {
        console.error('Error exporting uniform defiance records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});











/* Get uniform defiance counts by status (approved, rejected, pending) */
router.get('/defiance-status-counts', (req, res) => {
    try {
        db.query(`
            SELECT ud.status, COUNT(ud.slip_id) AS defiance_count 
            FROM uniform_defiance ud
            GROUP BY ud.status
        `, (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiance status counts:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                const uniformDefianceStatusCounts = {
                    approved: 0,
                    rejected: 0,
                    pending: 0
                };

                // Process the results and map the counts to their respective status
                result.forEach(row => {
                    if (row.status === 'approved') {
                        uniformDefianceStatusCounts.approved = row.defiance_count;
                    } else if (row.status === 'rejected') {
                        uniformDefianceStatusCounts.rejected = row.defiance_count;
                    } else if (row.status === 'pending') {
                        uniformDefianceStatusCounts.pending = row.defiance_count;
                    }
                });

                res.status(200).json(uniformDefianceStatusCounts);
            }
        });
    } catch (error) {
        console.error('Error loading uniform defiance status counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});







module.exports = router;
