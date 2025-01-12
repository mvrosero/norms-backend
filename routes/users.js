const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt'); // Make sure to import bcrypt
const router = express.Router();

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });



/* POST: Import Students by Department CSV */
router.post('/admin-usermanagement/:department_code', upload.single('file'), async (req, res) => {
    const results = [];
    const department_code = req.params.department_code;

    try {
        // Read and parse the CSV file
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                console.log('Parsed data:', data); // Log parsed data

                const {
                    student_idnumber,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    birthdate,
                    email,
                    password,
                    profile_photo_filename,
                    year_level,
                    batch,
                    program_id,
                    role_id
                } = data;

                // Check if required fields are present
                if (!student_idnumber || !first_name || !last_name || !email || !password) {
                    console.warn(`Missing required fields for record: ${JSON.stringify(data)}`);
                    return; // Skip this record if any required field is missing
                }

                // Log valid records
                console.log(`Valid record found: ${JSON.stringify(data)}`);

                // Push the record to results before hashing the password
                results.push({
                    student_idnumber,
                    first_name,
                    middle_name: middle_name || '', // Optional
                    last_name,
                    suffix: suffix || '', // Optional
                    birthdate: birthdate || '', // Optional
                    email,
                    password: password, // Raw password for hashing later
                    profile_photo_filename: profile_photo_filename || '', // Optional
                    year_level,
                    batch,
                    program_id,
                    role_id
                });
            })
            .on('end', async () => {
                // Check if any valid records were found
                if (results.length === 0) {
                    console.warn('No valid records found in results:', results);
                    return res.status(400).json({ error: 'No valid student records found in CSV' });
                }

                // Retrieve department_id based on the department_code
                const [departmentRows] = await db.promise().query(`
                    SELECT department_id FROM department WHERE department_code = ?
                `, [department_code]);

                if (departmentRows.length === 0) {
                    return res.status(400).json({ error: 'Invalid department code' });
                }

                const department_id = departmentRows[0].department_id;

                // Now we hash passwords and prepare for insertion
                const insertResults = [];
                for (const record of results) {
                    const hashedPassword = await bcrypt.hash(record.password, 10);
                    insertResults.push([
                        record.student_idnumber,
                        record.first_name,
                        record.middle_name,
                        record.last_name,
                        record.suffix,
                        record.birthdate,
                        record.email,
                        hashedPassword, // Hashed password
                        record.profile_photo_filename,
                        record.year_level,
                        record.batch,
                        department_id, // Use the fetched department_id
                        record.program_id,
                        record.role_id
                    ]);
                }

                // Construct the SQL insert query
                const insertStudentQuery = `
                    INSERT INTO user 
                    (student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, year_level, batch, department_id, program_id, role_id) 
                    VALUES ?
                `;

                // Insert all student records at once
                await db.promise().query(insertStudentQuery, [insertResults]);

                res.status(201).json({ message: 'Students registered successfully' });
            })
            .on('error', (error) => {
                console.error('Error parsing CSV:', error);
                res.status(500).json({ error: 'Failed to parse CSV file' });
            });
    } catch (error) {
        console.error('Error registering students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



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


/* Get user counts for each department, excluding archived users */
router.get('/user-counts-notarchived', (req, res) => {
    try {
        db.query(`
            SELECT d.department_name, COUNT(u.user_id) AS user_count 
            FROM department d 
            LEFT JOIN user u ON d.department_id = u.department_id 
            WHERE u.status != 'archived' OR u.status IS NULL
            GROUP BY d.department_id
        `, (err, result) => {
            if (err) {
                console.error('Error fetching user counts excluding archived users:', err);
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
        console.error('Error loading user counts excluding archived users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* Get users by department */
router.get('/admin-usermanagement/:department_code', (req, res) => {
    try {
        const department_code = req.params.department_code;
      //joined the program table to get the program_name
        db.query(`
            SELECT u.*, d.department_name, p.program_name  
            FROM user u
            INNER JOIN department d ON u.department_id = d.department_id
            INNER JOIN program p ON u.program_id = p.program_id
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
        WHERE d.department_code = ? AND u.status != 'archived'
    `, [department_code], (err, result) => {
        if (err) {
            console.error('Error fetching users by department:', err);
            return res.status(500).json({ message: 'Internal Server Error', error: err.message });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'No archived users found for the given department code' });
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
