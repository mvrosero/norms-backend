const express = require('express');
const fs = require('fs');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt');
const csv = require('csv-parser');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const secretKey = 'your_secret_key'; // Change to your actual secret key
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

/* POST: Import CSV */
router.post('/importcsv-student', upload.single('file'), async (req, res) => {
    const results = [];

    try {
        // Read and parse the CSV file
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                console.log('Parsed data:', data); // Log parsed data

                const { student_idnumber, first_name, last_name, email, password, profile_photo_filename, year_level, batch, department_id, program_id, role_id } = data;

                // Check if required fields are present
                if (!student_idnumber || !first_name || !last_name || !email || !password) {
                    console.warn(`Missing required fields for record: ${JSON.stringify(data)}`);
                    return; // Skip this record if any required field is missing
                }

                // Log valid records
                console.log(`Valid record found: ${JSON.stringify(data)}`);

                // Push the record to results after hashing the password
                results.push({
                    student_idnumber,
                    first_name,
                    middle_name: data.middle_name || '', // Optional
                    last_name,
                    suffix: data.suffix || '', // Optional
                    birthdate: data.birthdate || '', // Optional
                    email,
                    password: password, // Raw password for hashing later
                    profile_photo_filename: profile_photo_filename || '', // Optional
                    year_level,
                    batch,
                    department_id,
                    program_id,
                    role_id
                });
            })
            .on('end', async () => {
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
                        hashedPassword,
                        record.profile_photo_filename,
                        record.year_level,
                        record.batch,
                        record.department_id,
                        record.program_id,
                        record.role_id
                    ]);
                }

                // Check if any valid records were found
                if (insertResults.length === 0) {
                    console.warn('No valid records found in results:', results);
                    return res.status(400).json({ error: 'No valid student records found in CSV' });
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


/* post: student login */
router.post('/student-login', async (req, res) => {
    try {
        const { student_idnumber, password } = req.body;

        const getUserQuery = 'SELECT * FROM user WHERE student_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [student_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid student number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Retrieve the role_id and user_id from the user data
        const { role_id, user_id } = user;

        // Generate JWT token
        const token = jwt.sign(
            { student_idnumber: user.student_idnumber },
            secretKey,
            { expiresIn: '1h' }
        );

        // Return token, role_id, student_idnumber, and user_id in response
        res.status(200).json({ token, role_id, student_idnumber: user.student_idnumber, user_id });
    } catch (error) {
        console.error('Error logging in student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* post: register student */
router.post('/register-student', async (req, res) => {
    try {
        const { student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, year_level, batch, department_id, program_id, role_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertStudentQuery = `
            INSERT INTO user 
            (student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, year_level, batch, department_id, program_id, role_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.promise().execute(insertStudentQuery, [student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, hashedPassword, year_level, batch, department_id, program_id, role_id]);

        res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
        console.error('Error registering student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: 1 student using student_idnumber */
router.get('/student/:student_idnumber', (req, res) => {
    let student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        db.query(
            `SELECT u.student_idnumber, u.first_name, u.middle_name, u.last_name, u.suffix, u.birthdate, u.email, u.profile_photo_filename, u.year_level, u.batch, d.department_name, p.program_name, u.role_id, u.status 
             FROM user u 
             JOIN department d ON u.department_id = d.department_id 
             JOIN program p ON u.program_id = p.program_id 
             WHERE u.student_idnumber = ?`,
            student_idnumber,
            (err, result) => {
                if (err) {
                    console.error('Error fetching student:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json(result);
                }
            }
        );
    } catch (error) {
        console.error('Error loading student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: students by department_code */
router.get('/students/:department_code', (req, res) => {
    const department_code = req.params.department_code;

    if (!department_code) {
        return res.status(400).send({ error: true, message: 'Please provide department_code' });
    }

    try {
        db.query(`
            SELECT u.student_idnumber, u.first_name, u.middle_name, u.last_name, 
                   u.suffix, u.birthdate, u.email, u.profile_photo_filename, 
                   u.year_level, u.batch, d.department_name, 
                   p.program_name, u.role_id, u.status 
            FROM user u 
            JOIN department d ON u.department_id = d.department_id 
            JOIN program p ON u.program_id = p.program_id 
            WHERE d.department_code = ?`, 
            [department_code],
            (err, result) => {
                if (err) {
                    console.error('Error fetching students by department code:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json(result);
                }
            }
        );
    } catch (error) {
        console.error('Error loading students by department code:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: students*/
router.get('/students', (req, res) => {
    try {
        db.query(`SELECT * FROM user WHERE student_idnumber IS NOT NULL`, (err, result) => {
            if (err) {
                console.error('Error fetching students:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* put:  student */
router.put('/student/:id', async (req, res) => {
    let user_id = req.params.id;
    console.log('User ID:', user_id); // Log user_id for debugging
    console.log('Request Body:', req.body); // Log the request body for debugging

    const { student_idnumber, first_name, middle_name, last_name, suffix, email, year_level, batch, department_id, program_id, status } = req.body;

    // Check for required fields
    if (!user_id || !student_idnumber || !first_name || !last_name || !email || !year_level || !batch || !department_id || !program_id || !status) {
        return res.status(400).send({ error: 'Please provide all required details' });
    }

    try {
        db.query('UPDATE user SET student_idnumber = ?, first_name = ?, middle_name = ?, last_name = ?, suffix = ?, email = ?, year_level = ?, batch = ?, department_id = ?, program_id = ?, status = ? WHERE user_id = ?', 
        [student_idnumber, first_name, middle_name, last_name, suffix, email, year_level, batch, department_id, program_id, status, user_id], 
        (err, result, fields) => {
            if (err) {
                console.error('Error updating student:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            res.status(200).json(result);
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*put: student password*/
router.put('/password-change/:id', async (req, res) => {
    const user_id = req.params.id;
    const { current_password, new_password } = req.body;

    // Validate required fields
    if (!user_id || !current_password || !new_password) {
        return res.status(400).json({ error: 'Please provide all required details' });
    }

    try {
        // Fetch the current hashed password from the database
        db.query('SELECT password FROM user WHERE user_id = ?', [user_id], async (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const hashedPassword = results[0].password;

            // Verify the current password
            const match = await bcrypt.compare(current_password, hashedPassword);
            if (!match) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

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
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: student*/
router.delete('/student/:id', (req, res) => {
    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM user WHERE user_id = ?', [user_id], (err, result, fields) => {
            if (err) {
                console.error('Error deleting student:', err);
                return res.status(500).json({ message: 'Internal Server Error', details: err });
            } else {
                // Only return the success message
                res.status(200).json({ message: 'Student deleted successfully' });
            }
        });
    } catch (error) {
        console.error('Error loading student:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error });
    }
});






// DELETE: Batch delete students
router.delete('/students', async (req, res) => {
    const { student_ids } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'Please provide valid student IDs' });
    }

    try {
        const deleteQuery = `DELETE FROM user WHERE student_idnumber IN (?)`;
        await db.promise().query(deleteQuery, [student_ids]);

        res.status(200).json({ message: 'Students deleted successfully' });
    } catch (error) {
        console.error('Error deleting students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






// PUT: Batch update students
router.put('/students', async (req, res) => {
    const { student_ids, updates } = req.body;

    // Log the received request body for debugging purposes
    console.log('Received request body:', req.body);

    // Validate student_ids
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'Please provide valid student IDs' });
    }

    // Ensure at least one field is being updated
    const { year_level, department_id, program_id, status } = updates;
    if (!year_level && !department_id && !program_id && !status) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    // Additional validation for each field
    if (year_level && isNaN(year_level)) {
        return res.status(400).json({ error: 'Year level must be a valid number' });
    }
    if (department_id && isNaN(department_id)) {
        return res.status(400).json({ error: 'Department ID must be a valid number' });
    }
    if (program_id && isNaN(program_id)) {
        return res.status(400).json({ error: 'Program ID must be a valid number' });
    }
    if (status && typeof status !== 'string') {
        return res.status(400).json({ error: 'Status must be a valid string' });
    }

    // Optional: Add validation for status if you have specific valid values
    const validStatuses = ['Active', 'Inactive', 'Graduated']; // Example
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status must be one of: ' + validStatuses.join(', ') });
    }

    try {
        const placeholders = student_ids.map(() => '?').join(', '); // Generate placeholders for IDs

        const updateQuery = `
            UPDATE user 
            SET 
                year_level = IFNULL(?, year_level), 
                department_id = IFNULL(?, department_id), 
                program_id = IFNULL(?, program_id), 
                status = IFNULL(?, status)
            WHERE student_idnumber IN (${placeholders})
        `;

        // Combine updates with student IDs for the query parameters
        const queryParams = [
            year_level || null,
            department_id || null,
            program_id || null,
            status || null,
            ...student_ids // Spread IDs as individual values
        ];

        await db.promise().query(updateQuery, queryParams);

        res.status(200).json({ message: 'Students updated successfully' });
    } catch (error) {
        console.error('Error updating students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});







module.exports = router;
