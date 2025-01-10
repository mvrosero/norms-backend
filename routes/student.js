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

        // Validate student_idnumber format (should follow "00-00000")
        const idFormat = /^\d{2}-\d{5}$/; // Matches "00-00000" format
        if (!idFormat.test(student_idnumber)) {
            return res.status(400).json({ error: 'Invalid student ID number format. It should follow "00-00000".' });
        }

        // Validate names to start with a capital letter and allow letters, spaces, dashes, and dots
        const nameFormat = /^[A-Z][a-zA-Z .'-]*$/;
        if (!nameFormat.test(first_name)) {
            return res.status(400).json({ 
                error: 'First name must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
            });
        }
        if (middle_name && !nameFormat.test(middle_name)) { // Middle name is optional
            return res.status(400).json({ 
                error: 'Middle name must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
            });
        }
        if (!nameFormat.test(last_name)) {
            return res.status(400).json({ 
                error: 'Last name must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
            });
        }
        if (suffix && !nameFormat.test(suffix)) { // Suffix is optional
            return res.status(400).json({ 
                error: 'Suffix must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
            });
        }

        // Validate email to end with "@gbox.ncf.edu.ph"
        const emailFormat = /^[a-zA-Z0-9._%+-]+@gbox\.ncf\.edu\.ph$/;
        if (!emailFormat.test(email)) {
            return res.status(400).json({ error: 'Email must end with "@gbox.ncf.edu.ph".' });
        }

                // Check if program belongs to the department
                const programCheckQuery = `
                SELECT COUNT(*) AS count 
                FROM program 
                WHERE program_id = ? AND department_id = ?
            `;
            const [programCheckResult] = await db.promise().execute(programCheckQuery, [program_id, department_id]);
    
            if (programCheckResult[0].count === 0) {
                return res.status(400).json({
                    error: 'The selected program does not belong to the specified department.'
                });
            }

        // Validate password length (3-20 characters)
        if (password && (password.length < 3 || password.length > 20)) {
            return res.status(400).json({ error: 'Password must be between 3 and 20 characters.' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert student into database
        const insertStudentQuery = `
            INSERT INTO user 
            (student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, year_level, batch, department_id, program_id, role_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.promise().execute(insertStudentQuery, [student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, hashedPassword, year_level, batch, department_id, program_id, role_id]);

        res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
        console.error('Error registering student:', error);
    
        // Handle duplicate email error
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
            return res.status(400).json({
                error: 'DUPLICATE_EMAIL',
                message: 'A student with this email already exists.',
            });
        }
    
        // Handle duplicate student ID error
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('student_idnumber')) {
            return res.status(400).json({
                error: 'DUPLICATE_STUDENT_ID',
                message: 'A student with this student ID number already exists.',
            });
        }
    
        // Handle missing birthdate error
        if (error.message.includes('birthdate')) {
            return res.status(400).json({
                error: 'MISSING_BIRTHDATE',
                message: 'Please provide a valid birthdate.',
            });
        }
    
        // Handle missing required fields error
        if (error.message.includes('required fields')) {
            return res.status(400).json({
                error: 'MISSING_REQUIRED_FIELDS',
                message: 'Please fill in all required fields.',
            });
        }
    
        // General error handling
        res.status(500).json({
            error: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred. Please try again later.',
        });
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


// Get all users except those with status 'archived' and with a non-null student_idnumber
router.get('/students-not-archived', (req, res) => {
    try {
        const query = `SELECT * FROM user WHERE status != 'archived' AND student_idnumber IS NOT NULL`;
        console.log('Executing query:', query);  // Log the query being executed
        db.query(query, (err, result) => {
            if (err) {
                console.error('Error fetching non-archived students:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                console.log('Query result:', result);  // Log the result returned by the database
                if (result.length === 0) {
                    console.log('No users found');  // Log if no users are found
                }
                res.status(200).json(result);  // Send the result to the client
            }
        });
    } catch (error) {
        console.error('Error loading non-archived students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Get users with status 'archived'
router.get('/students-archived', (req, res) => {
    try {
        const query = `SELECT * FROM user WHERE status = 'archived'`;
        console.log('Executing query:', query);  // Log the SQL query
        db.query(query, (err, result) => {
            if (err) {
                console.error('Error fetching archived students:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                console.log('Query result:', result);  // Log the raw result returned by the query
                if (result.length === 0) {
                    console.log('No archived users found');
                }
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading archived students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





/* put:  student */
router.put('/student/:id', async (req, res) => {
    let user_id = req.params.id;
    console.log('User ID:', user_id);
    console.log('Request Body:', req.body);

    const { student_idnumber, birthdate, first_name, middle_name, last_name, suffix, email, year_level, batch, department_id, program_id, status, password } = req.body;

    // Validate required fields
    if (!user_id || !student_idnumber || !first_name || !last_name || !email || !year_level || !batch || !department_id || !program_id || !status) {
        return res.status(400).send({ error: 'Please provide all required details' });
    }

    // Validate student_idnumber format (should follow "00-00000")
    const idFormat = /^\d{2}-\d{5}$/; // Matches "00-00000" format
    if (!idFormat.test(student_idnumber)) {
        return res.status(400).json({ error: 'Invalid student ID number format. It should follow "00-00000".' });
    }

    // Validate names to start with a capital letter and allow letters, spaces, dashes, and dots
    const nameFormat = /^[A-Z][a-zA-Z .'-]*$/;
    if (!nameFormat.test(first_name)) {
        return res.status(400).json({ 
            error: 'First name must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
        });
    }
    if (middle_name && !nameFormat.test(middle_name)) { // Middle name is optional
        return res.status(400).json({ 
            error: 'Middle name must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
        });
    }
    if (!nameFormat.test(last_name)) {
        return res.status(400).json({ 
            error: 'Last name must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
        });
    }
    if (suffix && !nameFormat.test(suffix)) { // Suffix is optional
        return res.status(400).json({ 
            error: 'Suffix must start with a capital letter and can contain only letters, spaces, dots, or dashes.' 
        });
    }

    // Validate email to end with "@gbox.ncf.edu.ph"
    const emailFormat = /^[a-zA-Z0-9._%+-]+@gbox\.ncf\.edu\.ph$/;
    if (!emailFormat.test(email)) {
        return res.status(400).json({ error: 'Email must end with "@gbox.ncf.edu.ph".' });
    }


        // Validate password length (3)
        if (password && (password.length < 3 )) {
            return res.status(400).json({ error: 'Password must be be atleast 3 characters' });
        }


    let hashedPassword = null;
    if (password) {
        try {
            hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds for bcrypt
        } catch (error) {
            console.error('Error hashing password:', error);
            return res.status(500).json({ message: 'Error hashing password. Please try again.' });
        }
    }

    try {
        // Verify program and department relation
        db.query('SELECT * FROM program WHERE program_id = ? AND department_id = ?', [program_id, department_id], (err, result) => {
            if (err) {
                console.error('Error checking program and department:', err);
                return res.status(500).json({ message: 'Internal Server Error while verifying program and department.' });
            }

            if (result.length === 0) {
                return res.status(400).json({ message: 'Program does not belong to the selected department' });
            }

            // Proceed with the update query
            const updates = [
                'student_idnumber = ?',
                'birthdate = ?',
                'first_name = ?',
                'middle_name = ?',
                'last_name = ?',
                'suffix = ?',
                'email = ?',
                'year_level = ?',
                'batch = ?',
                'department_id = ?',
                'program_id = ?',
                'status = ?'
            ];

            const values = [
                student_idnumber,
                birthdate,
                first_name,
                middle_name,
                last_name,
                suffix,
                email,
                year_level,
                batch,
                department_id,
                program_id,
                status
            ];

            if (hashedPassword) {
                updates.push('password = ?');
                values.push(hashedPassword);
            }

            db.query(
                `UPDATE user SET ${updates.join(', ')} WHERE user_id = ?`,
                [...values, user_id],
                (err, result) => {
                    if (err) {
                        console.error('Error updating student:', err);
                        return res.status(500).json({ message: 'Error updating student information. Please try again later.' });
                    }
                    res.status(200).json(result);
                }
            );
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'An unexpected error occurred while updating student information.' });
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

    // Validate student_ids
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'Please provide valid student IDs' });
    }

    // Ensure at least one field is being updated
    const { year_level, department_id, program_id, status } = updates;
    if (!year_level && !department_id && !program_id && !status) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    // Validate individual update fields
    if (department_id && isNaN(department_id)) {
        return res.status(400).json({ error: 'Department ID must be a valid number' });
    }
    if (program_id && isNaN(program_id)) {
        return res.status(400).json({ error: 'Program ID must be a valid number' });
    }
    if (status && typeof status !== 'string') {
        return res.status(400).json({ error: 'Status must be a valid string' });
    }

    try {
        // Fetch programs based on department_id if provided
        let programs = [];
        if (department_id) {
            const [programResults] = await db.promise().query('SELECT * FROM program WHERE department_id = ?', [department_id]);
            programs = programResults;
        }

        // If program_id is provided, check if it matches the department
        if (program_id && department_id) {
            const [programCheck] = await db.promise().query('SELECT * FROM program WHERE department_id = ? AND program_id = ?', [department_id, program_id]);
            if (programCheck.length === 0) {
                return res.status(400).json({ error: 'Program ID does not match the selected department' });
            }
        }

        const placeholders = student_ids.map(() => '?').join(', '); // Generate placeholders for IDs

        // Update query
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

        // Execute the update query
        const [result] = await db.promise().query(updateQuery, queryParams);
        console.log('Update result:', result);  // Log the result of the query
        console.log('Student IDs:', student_ids);  // Log the student IDs

        // Return success response
        res.status(200).json({ message: 'Students updated successfully', programs });
    } catch (error) {
        console.error('Error updating students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});







module.exports = router;
