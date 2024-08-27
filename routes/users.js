const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../app/configuration/database');
const router = express.Router();

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

/* Get all - users */
router.get('/users', (req, res) => {
    try {
        db.query(`SELECT * FROM user`, (err, result) => {
            if (err) {
                console.error('Error fetching users:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Get user counts for each department */
router.get('/user-counts', (req, res) => {
    try {
        db.query(`
            SELECT d.department_name, COUNT(u.user_id) AS user_count 
            FROM department d 
            LEFT JOIN user u ON d.department_id = u.department_id 
            GROUP BY d.department_id
        `, (err, result) => {
            if (err) {
                console.error('Error fetching user counts:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                const userCounts = {};
                result.forEach(row => {
                    userCounts[row.department_name] = row.user_count;
                });
                res.status(200).json(userCounts);
            }
        });
    } catch (error) {
        console.error('Error loading user counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Get users by department */
router.get('/admin-usermanagement/:department_code', (req, res) => {
    try {
        const department_code = req.params.department_code;

        db.query(`
            SELECT u.*, d.department_name FROM user u
            INNER JOIN department d ON u.department_id = d.department_id
            WHERE d.department_code = ?
        `, [department_code], (err, result) => {
            if (err) {
                console.error('Error fetching users by department:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                console.log('Fetched users by department:', result); // Log the fetched users
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users by department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Get users by department code */
router.get('/coordinator-studentrecords/:department_code', (req, res) => {
    const department_code = req.params.department_code;

    if (!department_code) {
        return res.status(400).json({ message: 'Department code is required' });
    }

    db.query(`
        SELECT u.*, d.department_name
        FROM user u
        INNER JOIN department d ON u.department_id = d.department_id
        WHERE d.department_code = ?
    `, [department_code], (err, result) => {
        if (err) {
            console.error('Error fetching users by department:', err);
            return res.status(500).json({ message: 'Internal Server Error', error: err.message });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'No users found for the given department code' });
        }

        res.status(200).json(result);
    });
});

/* Import users from CSV */
router.post('/import-csv', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    
    const users = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            // Create a user object based on CSV columns
            const user = {
                student_idnumber: row.student_idnumber,
                first_name: row.first_name,
                middle_name: row.middle_name,
                last_name: row.last_name,
                suffix: row.suffix,
                email: row.email,
                year_level: row.year_level,
                program_id: row.program_id,
                status: row.status // Must be 'active' or 'inactive'
            };
            users.push(user);
        })
        .on('end', () => {
            // Insert users into the database
            const values = users.map(user => [
                user.student_idnumber,
                user.first_name,
                user.middle_name,
                user.last_name,
                user.suffix,
                user.email,
                user.year_level,
                user.program_id,
                user.status
            ]);

            db.query(`
                INSERT INTO user (
                    student_idnumber,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    email,
                    year_level,
                    program_id,
                    status
                ) VALUES ?
            `, [values], (err, result) => {
                if (err) {
                    console.error('Error importing CSV data:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json({ message: 'CSV data imported successfully' });
                }
            });
        });
});



module.exports = router;
