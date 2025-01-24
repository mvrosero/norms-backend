const express = require('express');
const fs = require('fs');
const multer = require('multer');
const csv = require('csv-parser');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt'); // Make sure to import bcrypt
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });



/* POST: Import Students by Department CSV */
// POST: Import Students by Department CSV
router.post('/importcsv-departmental/:department_code', upload.single('file'), async (req, res) => {
    const results = [];
    const department_code = req.params.department_code;

    try {
        // Use the buffer from memory storage and parse the CSV data directly
        const csvData = req.file.buffer.toString('utf-8');
        const parsedData = await csv().fromString(csvData);

        parsedData.forEach((data) => {
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
                created_by,
                program_code // Changed from program_id to program_name
            } = data;

            // Check if required fields are present
            if (!student_idnumber || !first_name || !last_name || !email || !password || !created_by) {
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
                created_by,
                program_code, // Changed from program_id to program_name
                role_id: 3 // Default role_id set to 3
            });
        });

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

        // Map program_name to program_id
        const [programRows] = await db.promise().query(`
            SELECT program_id, program_code FROM program
        `);

        const programMap = {};
        programRows.forEach(row => {
            programMap[row.program_code] = row.program_id;
        });

        const insertResults = [];
        for (const record of results) {
            const program_id = programMap[record.program_code];
            if (!program_id) {
                console.warn(`Invalid program_code: ${record.program_code}`);
                continue; // Skip records with invalid program_name
            }

            const hashedPassword = await bcrypt.hash(record.password, 10);
            insertResults.push([
                record.student_idnumber,
                record.first_name,
                record.middle_name,
                record.last_name,
                record.suffix,
                record.birthdate,
                record.email,
                hashedPassword, 
                record.profile_photo_filename,
                record.year_level,
                record.batch,
                record.created_by,
                department_id, 
                program_id, 
                record.role_id
            ]);
        }

        if (insertResults.length === 0) {
            return res.status(400).json({ error: 'No valid records to insert' });
        }

        // Construct the SQL insert query
        const insertStudentQuery = `
            INSERT INTO user 
            (student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, year_level, batch, created_by, department_id, program_id, role_id) 
            VALUES ?
        `;

        // Insert all student records at once
        await db.promise().query(insertStudentQuery, [insertResults]);

        res.status(201).json({ message: 'Students registered successfully' });
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

        db.query(
            `
            SELECT 
                u.*, 
                d.department_name, 
                p.program_name, 
                CONCAT(c.first_name, ' ', c.middle_name, ' ', c.last_name, ' ', c.suffix) AS created_by
            FROM user u
            INNER JOIN department d ON u.department_id = d.department_id
            INNER JOIN program p ON u.program_id = p.program_id
            LEFT JOIN user c ON u.created_by = c.user_id
            WHERE d.department_code = ?
            `,
            [department_code],
            (err, result) => {
                if (err) {
                    console.error('Error fetching users by department:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    console.log('Fetched users by department:', result); // Log the fetched users
                    res.status(200).json(result);
                }
            }
        );
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
        SELECT 
            u.*, 
            d.department_name, 
            p.program_name, 
            CONCAT(c.first_name, ' ', c.middle_name, ' ', c.last_name, ' ', c.suffix) AS created_by
        FROM user u
        INNER JOIN department d ON u.department_id = d.department_id
        LEFT JOIN program p ON u.program_id = p.program_id
        LEFT JOIN user c ON u.created_by = c.user_id
        WHERE d.department_code = ? AND u.status != 'archived'
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






/* Get user counts by status (active, inactive, archived) */
router.get('/user-status-counts', (req, res) => {
    try {
        db.query(`
            SELECT u.status, COUNT(u.user_id) AS user_count 
            FROM user u
            GROUP BY u.status
        `, (err, result) => {
            if (err) {
                console.error('Error fetching user status counts:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                const userStatusCounts = {
                    active: 0,
                    inactive: 0,
                    archived: 0
                };

                // Process the results and map the counts to their respective status
                result.forEach(row => {
                    if (row.status === 'active') {
                        userStatusCounts.active = row.user_count;
                    } else if (row.status === 'inactive') {
                        userStatusCounts.inactive = row.user_count;
                    } else if (row.status === 'archived') {
                        userStatusCounts.archived = row.user_count;
                    }
                });

                res.status(200).json(userStatusCounts);
            }
        });
    } catch (error) {
        console.error('Error loading user status counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






// PUT: password reset
// PUT: password reset with confirm password
router.put('/password-reset/:id', async (req, res) => {
    const user_id = req.params.id;
    const { new_password, confirm_password } = req.body;

    // Validate required fields
    if (!new_password || !confirm_password) {
        return res.status(400).json({ error: 'Please provide both new password and confirm password' });
    }

    // Check if passwords match
    if (new_password !== confirm_password) {
        return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    // Check if the new password is at least 3 characters long
    if (new_password.length < 3) {
        return res.status(400).json({ error: 'New password must be at least 3 characters long' });
    }

    try {
        // Hash the new password
        const newHashedPassword = await bcrypt.hash(new_password, 10);

        // Update the new password in the database
        db.query('UPDATE user SET password = ? WHERE user_id = ?', [newHashedPassword, user_id], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Check if user exists and was updated
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.status(200).json({ message: 'Password reset successfully' });
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






/*put: user password*/
router.put('/password-change/:user_id', async (req, res) => {
    const user_id = req.params.user_id;  // Corrected to use `user_id`
    const { new_password, confirm_password } = req.body;

    // Validate required fields
    if (!user_id || !new_password || !confirm_password) {
        return res.status(400).json({ error: 'Please provide all required details' });
    }

    // Check if new password and confirm password match
    if (new_password !== confirm_password) {
        return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    try {
        // Hash the new password
        const newHashedPassword = await bcrypt.hash(new_password, 10);

        // Update the new password in the database
        db.query('UPDATE user SET password = ? WHERE user_id = ?', [newHashedPassword, user_id], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.status(200).json({ message: 'Password updated successfully' });
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





module.exports = router;
