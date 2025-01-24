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
                console.log('Parsed data:', data);

                // Ensure the required fields are present
                const { student_idnumber, first_name, last_name, email, password, year_level, batch, program_code, department_code, created_by } = data;

                if (!student_idnumber || !first_name || !last_name || !email || !password || !program_code || !department_code || !created_by) {
                    console.warn(`Missing required fields for record: ${JSON.stringify(data)}`);
                    return; // Skip this record if any required field is missing
                }

                console.log(`Valid record found: ${JSON.stringify(data)}`);

                results.push({
                    student_idnumber,
                    first_name,
                    middle_name: data.middle_name || '',
                    last_name,
                    suffix: data.suffix || '',
                    birthdate: data.birthdate || '',
                    email,
                    password,
                    year_level,
                    batch,
                    program_code,
                    department_code,
                    role_id: data.role_id || '3',
                    created_by // Add user_id from the CSV
                });
            })
            .on('end', async () => {
                console.log(`Total parsed records: ${results.length}`);
                if (results.length === 0) {
                    console.warn('No valid records found in results:', results);
                    return res.status(400).json({ error: 'No valid student records found in CSV' });
                }

                const departmentMap = {};
                const programMap = {};

                for (const record of results) {
                    if (!departmentMap[record.department_code]) {
                        const [departmentRows] = await db.promise().query(
                            `SELECT department_id FROM department WHERE department_code = ?`,
                            [record.department_code]
                        );
                        if (departmentRows.length === 0) {
                            return res.status(400).json({ error: `Invalid department code: ${record.department_code}` });
                        }
                        departmentMap[record.department_code] = departmentRows[0].department_id;
                    }

                    if (!programMap[record.program_code]) {
                        const [programRows] = await db.promise().query(
                            `SELECT program_id FROM program WHERE program_code = ?`,
                            [record.program_code]
                        );
                        if (programRows.length === 0) {
                            return res.status(400).json({ error: `Invalid program code: ${record.program_code}` });
                        }
                        programMap[record.program_code] = programRows[0].program_id;
                    }
                }

                const insertResults = [];
                for (const record of results) {
                    const hashedPassword = await bcrypt.hash(record.password, 10);
                    insertResults.push([ // Prepare for insertion into the database
                        record.student_idnumber,
                        record.first_name,
                        record.middle_name,
                        record.last_name,
                        record.suffix,
                        record.birthdate,
                        record.email,
                        hashedPassword,
                        record.year_level,
                        record.batch,
                        departmentMap[record.department_code],
                        programMap[record.program_code],
                        record.role_id,
                        record.created_by // Insert user_id for record creation
                    ]);
                }

                if (insertResults.length === 0) {
                    console.warn('No valid records prepared for insertion:', insertResults);
                    return res.status(400).json({ error: 'No valid student records found in CSV' });
                }

                // Check for duplicate student records (by student_idnumber or email)
                for (const record of insertResults) {
                    const [existingStudent] = await db.promise().query(
                        'SELECT * FROM user WHERE student_idnumber = ? OR email = ?',
                        [record[0], record[6]]
                    );
                    if (existingStudent.length > 0) {
                        return res.status(400).json({
                            error: `Duplicate entry found: ${
                                existingStudent[0].student_idnumber === record[0] ? 'student ID number' : 'email'
                            } already exists.`
                        });
                    }
                }

                const insertStudentQuery = `
                    INSERT INTO user 
                    (student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, year_level, batch, department_id, program_id, role_id, created_by) 
                    VALUES ?
                `;
                await db.promise().query(insertStudentQuery, [insertResults]);

                res.status(201).json({ message: 'Students registered successfully' });
            })
            .on('error', (error) => {
                console.error('Error parsing CSV:', error);
                res.status(500).json({ error: error.message || 'Failed to parse CSV file' });
            });
    } catch (error) {
        console.error('Error registering students:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
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
        const {
            student_idnumber,
            first_name,
            middle_name,
            last_name,
            suffix,
            birthdate,
            email,
            password,
            year_level,
            batch,
            department_id,
            program_id,
            created_by // Added `created_by` in the request body
        } = req.body;

        // Log the input data for debugging purposes
        console.log("Request Body:", req.body);

        // Replace undefined fields with null
        const validatedMiddleName = middle_name ?? null;
        const validatedSuffix = suffix ?? null;
        const validatedBirthdate = birthdate ?? null;
        const validatedYearLevel = year_level ?? null;
        const validatedBatch = batch ?? null;
        const validatedDepartmentId = department_id ?? null;
        const validatedProgramId = program_id ?? null;
        const validatedCreatedBy = created_by ?? null;

        // Validate student_idnumber format (should follow "00-00000")
        const idFormat = /^\d{2}-\d{5}$/;
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
        if (validatedMiddleName && !nameFormat.test(validatedMiddleName)) {
            return res.status(400).json({
                error: 'Middle name must start with a capital letter and can contain only letters, spaces, dots, or dashes.'
            });
        }
        if (!nameFormat.test(last_name)) {
            return res.status(400).json({
                error: 'Last name must start with a capital letter and can contain only letters, spaces, dots, or dashes.'
            });
        }
        if (validatedSuffix && !nameFormat.test(validatedSuffix)) {
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
            WHERE program_id = ? AND department_id = ?;
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

        // Log the values being passed to the SQL query for debugging
        console.log("Values being passed to the query:", [
            student_idnumber,
            first_name,
            validatedMiddleName,
            last_name,
            validatedSuffix,
            validatedBirthdate,
            email,
            hashedPassword,
            validatedYearLevel,
            validatedBatch,
            validatedDepartmentId,
            validatedProgramId,
            created_by
        ]);

        // Insert student into database with `created_by`
        const insertStudentQuery = `
            INSERT INTO user 
            (student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, year_level, batch, department_id, program_id, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        await db.promise().execute(insertStudentQuery, [
            student_idnumber,
            first_name,
            validatedMiddleName,
            last_name,
            validatedSuffix,
            validatedBirthdate,
            email,
            hashedPassword,
            validatedYearLevel,
            validatedBatch,
            validatedDepartmentId,
            validatedProgramId,
            validatedCreatedBy
        ]);

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
            `SELECT 
                u.student_idnumber, 
                u.first_name, 
                u.middle_name, 
                u.last_name, 
                u.suffix, 
                u.birthdate, 
                u.email, 
                u.profile_photo_filename, 
                u.year_level, 
                u.batch, 
                d.department_name, 
                p.program_name, 
                u.role_id, 
                u.status, 
                CONCAT(c.first_name, ' ', c.middle_name, ' ', c.last_name, ' ', c.suffix) AS created_by
             FROM user u
             JOIN department d ON u.department_id = d.department_id
             JOIN program p ON u.program_id = p.program_id
             LEFT JOIN user c ON u.created_by = c.user_id
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
        // Modify query to join with both the departments and programs tables
        const query = `
            SELECT user.*, department.department_name, program.program_name
            FROM user
            LEFT JOIN department ON user.department_id = department.department_id
            LEFT JOIN program ON user.program_id = program.program_id
            WHERE user.status != 'archived' AND user.student_idnumber IS NOT NULL
        `;
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



// Get all users except those with status 'archived' and with a non-null student_idnumber
router.get('/students-archived', (req, res) => {
    try {
        // Modify query to join with both the departments and programs tables
        const query = `
            SELECT user.*, department.department_name, program.program_name
            FROM user
            LEFT JOIN department ON user.department_id = department.department_id
            LEFT JOIN program ON user.program_id = program.program_id
            WHERE user.status = 'archived' AND user.student_idnumber IS NOT NULL
        `;
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








/* PUT: Update student information */
router.put('/student/:id', async (req, res) => {
    let user_id = req.params.id;
    const { student_idnumber, birthdate, first_name, middle_name, last_name, suffix, email, year_level, batch, department_id, program_id, status, password, updatedBy } = req.body;

    console.log('User ID:', user_id);
    console.log('Request Body:', req.body);

    // Validate required fields
    if (!user_id || !student_idnumber || !first_name || !last_name || !email || !year_level || !batch || !status) {
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
        return res.status(400).json({ error: 'Password must be at least 3 characters' });
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
        // Get current department, program, year_level, status, and batch of the student
        db.query('SELECT department_id, program_id, year_level, status, batch FROM user WHERE user_id = ?', [user_id], (err, result) => {
            if (err) {
                console.error('Error fetching current department, program, year_level, status, and batch:', err);
                return res.status(500).json({ message: 'Error fetching current department, program, year_level, status, and batch.' });
            }

            const currentDepartmentId = result[0]?.department_id;
            const currentProgramId = result[0]?.program_id;
            const currentYearLevel = result[0]?.year_level;
            const currentStatus = result[0]?.status;
            const currentBatch = result[0]?.batch;

            // Check if any changes occurred
            const changes = {
                department: currentDepartmentId !== department_id,
                program: currentProgramId !== program_id,
                year_level: currentYearLevel !== year_level,
                status: currentStatus !== status,
                batch: currentBatch !== batch
            };

            const historyValues = [
                user_id,
                currentDepartmentId, department_id,
                currentProgramId, program_id,
                currentYearLevel, year_level,
                currentStatus, status,
                currentBatch, batch,
                updatedBy // Use the updatedBy value passed from frontend
            ];

            // Update the history values based on changes
            Object.keys(changes).forEach((field, index) => {
                if (!changes[field]) {
                    historyValues[index * 2 + 1] = null; // Set old value to null if no change
                    historyValues[index * 2 + 2] = null; // Set new value to null if no change
                }
            });

            const historyColumns = [
                'user_id', 
                'old_department_id', 'new_department_id', 
                'old_program_id', 'new_program_id',
                'old_year_level', 'new_year_level',
                'old_status', 'new_status',
                'old_batch', 'new_batch',
                'updated_by'
            ];

            if (historyValues.some(val => val !== null)) {
                // Insert into user_history only if there's a change
                db.query(
                    `INSERT INTO user_history (${historyColumns.join(', ')}) VALUES (${historyValues.map(() => '?').join(', ')})`,
                    historyValues,
                    (err, result) => {
                        if (err) {
                            console.error('Error inserting into user_history:', err);
                            return res.status(500).json({ message: 'Error logging changes.' });
                        }
                    }
                );
            }

            // Proceed with the student update query
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
                'status = ?',
                'department_id = ?',
                'program_id = ?'
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
                status,
                department_id,
                program_id
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
                    res.status(200).json({ message: 'Student updated successfully', result });
                }
            );
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'An unexpected error occurred while updating student information.' });
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
    const { student_ids, updates, updatedBy } = req.body;

    console.log('Request Body:', req.body);  // Log the whole request body for debugging

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
        // Fetch current data of the students to compare
        const studentsQuery = `SELECT user_id, department_id, program_id, year_level, status FROM user WHERE student_idnumber IN (?)`;
        const [students] = await db.promise().query(studentsQuery, [student_ids]);

        if (students.length === 0) {
            return res.status(404).json({ error: 'Some students not found' });
        }

        // Prepare the history records to be inserted, including the updatedBy field
        const historyRecords = students.map(student => {
            return {
                user_id: student.user_id,
                old_department_id: student.department_id,
                new_department_id: department_id || student.department_id,
                old_program_id: student.program_id,
                new_program_id: program_id || student.program_id,
                old_year_level: student.year_level,
                new_year_level: year_level || student.year_level,
                old_status: student.status,
                new_status: status || student.status,
                updated_by: updatedBy, // Correctly use the updatedBy variable
                changed_at: new Date()
            };
        });

        // Insert the history records into the user_history table
        const historyQuery = `
            INSERT INTO user_history (user_id, old_department_id, new_department_id, old_program_id, new_program_id, 
                old_year_level, new_year_level, old_status, new_status, updated_by, changed_at)
            VALUES ?
        `;
        const historyValues = historyRecords.map(record => [
            record.user_id,
            record.old_department_id,
            record.new_department_id,
            record.old_program_id,
            record.new_program_id,
            record.old_year_level,
            record.new_year_level,
            record.old_status,
            record.new_status,
            record.updated_by,
            record.changed_at
        ]);

        await db.promise().query(historyQuery, [historyValues]);

        // Generate the update query for the student records
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

        // Execute the update query
        const [result] = await db.promise().query(updateQuery, queryParams);
        console.log('Update result:', result);  // Log the result of the query
        console.log('Student IDs:', student_ids);  // Log the student IDs

        // Return success response
        res.status(200).json({ message: 'Students updated successfully' });
    } catch (error) {
        console.error('Error updating students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;
