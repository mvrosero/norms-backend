const express = require('express');
const fs = require('fs');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt');
const csv = require('csv-parser');
const multer = require('multer');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Secret key for JWT signing (ensure this is secure and not hard-coded in production)
const secretKey = 'your_secret_key'; // Change to your actual secret key


/* POST: Import Employee CSV */
router.post("/importcsv-employee", upload.single("file"), async (req, res) => {
    const results = [];

    try {
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on("data", (data) => {
                const {
                    employee_idnumber,
                    first_name,
                    last_name,
                    email,
                    password,
                    created_by,
                    role_code,
                } = data;

                // Check for missing fields
                if (
                    !employee_idnumber ||
                    !first_name ||
                    !last_name ||
                    !email ||
                    !password ||
                    !created_by ||
                    !role_code
                ) {
                    console.warn(
                        `Missing required fields for record: ${JSON.stringify(data)}`
                    );
                    return; // Skip this record if any required field is missing
                }

                results.push({
                    employee_idnumber,
                    first_name,
                    middle_name: data.middle_name || "",
                    last_name,
                    suffix: data.suffix || "",
                    birthdate: data.birthdate || null,
                    email,
                    password,
                    created_by,
                    role_code,
                });
            })
            .on("end", async () => {
                try {
                    const insertResults = [];

                    for (const record of results) {
                        // Step 1: Map role_code to role_id
                        const [role] = await db
                            .promise()
                            .query("SELECT role_id FROM role WHERE role_code = ?", [
                                record.role_code,
                            ]);

                        if (!role.length) {
                            console.warn(`Role with code ${record.role_code} not found.`);
                            continue; // Skip if role_id is not found
                        }

                        const role_id = role[0].role_id;

                        // Step 2: Validate created_by exists
                        const [creator] = await db
                            .promise()
                            .query("SELECT user_id FROM user WHERE user_id = ?", [
                                record.created_by,
                            ]);

                        if (!creator.length) {
                            console.warn(
                                `Creator ID ${record.created_by} not found. Skipping record.`
                            );
                            continue;
                        }

                        // Step 3: Check for duplicate employee_idnumber or email
                        const [existingEmployee] = await db
                            .promise()
                            .query(
                                "SELECT * FROM user WHERE employee_idnumber = ? OR email = ?",
                                [record.employee_idnumber, record.email]
                            );

                        if (existingEmployee.length > 0) {
                            console.warn(
                                `Duplicate entry found for employee ID: ${record.employee_idnumber} or email: ${record.email}. Skipping record.`
                            );
                            continue;
                        }

                        // Step 4: Hash password
                        const hashedPassword = await bcrypt.hash(record.password, 10);

                        // Step 5: Prepare the record for insertion
                        insertResults.push([ 
                            record.employee_idnumber,
                            record.first_name,
                            record.middle_name,
                            record.last_name,
                            record.suffix,
                            record.birthdate,
                            record.email,
                            hashedPassword,
                            record.created_by,
                            role_id,
                        ]);
                    }

                    if (insertResults.length === 0) {
                        return res
                            .status(400)
                            .json({ error: "No valid records to insert." });
                    }

                    // Step 6: Insert records into the database
                    const insertEmployeeQuery = `
                        INSERT INTO user 
                        (employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, created_by, role_id) 
                        VALUES ?
                    `;
                    await db.promise().query(insertEmployeeQuery, [insertResults]);

                    res.status(201).json({
                        message: `${insertResults.length} employees registered successfully.`,
                    });
                } catch (error) {
                    console.error("Error processing CSV data:", error);
                    res.status(500).json({ error: "Failed to process CSV data." });
                }
            })
            .on("error", (error) => {
                console.error("Error parsing CSV:", error);
                res.status(500).json({ error: "Failed to parse CSV file." });
            });
    } catch (error) {
        console.error("Error registering employees:", error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

    

    






/* post: employee login */
router.post('/employee-login', async (req, res) => {
    try {
        const { employee_idnumber, password } = req.body;

        // Sanitize input and prevent SQL injection
        const getUserQuery = 'SELECT * FROM user WHERE employee_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [employee_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid employee number or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid employee number or password' });
        }

        // Generate JWT token with minimal payload
        const tokenPayload = {
            user_id: user.user_id, // Include user_id
            userId: user.employee_idnumber,
            role_id: user.role_id
        };
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '1h' }); // Use the secret key here

        // Return token and role_id in response
        res.status(200).json({ token, user_id: user.user_id, role_id: user.role_id });
    } catch (error) {
        console.error('Error logging in employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






/* post: register employee */
router.post('/register-employee', async (req, res) => {
    try {
        const {
            employee_idnumber,
            first_name,
            middle_name,
            last_name,
            suffix, 
            birthdate,
            email,
            password,
            role_id,
            created_by 
        } = req.body;


        // Log the input data for debugging purposes
        console.log("Request Body:", req.body);

        // Replace undefined fields with null
        const validatedMiddleName = middle_name ?? null;
        const validatedSuffix = suffix ?? null;
        const validatedBirthdate = birthdate ?? null;
        const validatedCreatedBy = created_by ?? null;


        // Validate required fields
        if (!employee_idnumber || !first_name || !last_name || !birthdate || !email || !password || !role_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate employee_idnumber format
        const idFormat = /^\d{2}-\d{5}$/; // Matches "00-00000" format
        if (!idFormat.test(employee_idnumber)) {
            return res.status(400).json({ error: 'Invalid employee ID number format. It should follow "00-00000".' });
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

        // Validate email format
        const emailFormat = /^[a-zA-Z0-9._%+-]+@ncf\.edu\.ph$/;
        if (!emailFormat.test(email)) {
            return res.status(400).json({ error: 'Invalid email format. Email must end with "@ncf.edu.ph".' });
        }

        // Validate password length (between 3 and 20 characters)
        if (password.length < 3 || password.length > 20) {
            return res.status(400).json({ error: 'Password must be between 3 and 20 characters long.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Log the values being passed to the SQL query for debugging
        console.log("Values being passed to the query:", [
            employee_idnumber,
            first_name,
            validatedMiddleName,
            last_name,
            validatedSuffix,
            validatedBirthdate,
            email,
            hashedPassword,
            created_by
        ]);

        // Insert employee into database
        const insertEmployeeQuery = `
            INSERT INTO user 
            (employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, role_id, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.promise().execute(insertEmployeeQuery, [
            employee_idnumber,
            first_name,
            validatedMiddleName,
            last_name,
            validatedSuffix,
            validatedBirthdate,
            email,
            hashedPassword,
            role_id,
            validatedCreatedBy
        ]);

        res.status(201).json({ message: 'Employee registered successfully' });
    } catch (error) {
        console.error('Error registering employee:', error);
    
        // Handle duplicate email error
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
            return res.status(400).json({
                error: 'DUPLICATE_EMAIL',
                message: 'An employee with this email already exists.',
            });
        }
    
        // Handle duplicate employee ID error
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('employee_idnumber')) {
            return res.status(400).json({
                error: 'DUPLICATE_EMPLOYEE_ID',
                message: 'An employee with this employee ID number already exists.',
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





/*get: 1 employee*/
router.get('/employee/:id', (req, res) => {
    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('SELECT employee_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, profile_photo_filename, role_id, status  FROM user WHERE user_id = ?', user_id, (err, result) => {
            if (err) {
                console.error('Error fetching employee:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// Get employee by employee_idnumber
router.get('/employees/:employee_idnumber', async (req, res) => {
    const employee_idnumber = req.params.employee_idnumber.trim(); // Trim spaces

    if (!employee_idnumber) {
        return res.status(400).json({ error: 'Please provide employee_idnumber' });
    }

    const sqlQuery = `
        SELECT 
            CONCAT_WS(' ', first_name, COALESCE(middle_name, ''), last_name, COALESCE(suffix, '')) AS full_name
        FROM user
        WHERE employee_idnumber = ?
    `;

    console.log('Executing SQL Query:', sqlQuery);
    console.log('With Parameter:', employee_idnumber);

    try {
        const [rows] = await db.promise().execute(sqlQuery, [employee_idnumber]);

        console.log('Query Result:', rows);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.status(200).json({ name: rows[0].full_name });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: employees*/
router.get('/employees', (req, res) => {
    try {
        const query = `
            SELECT 
                user.*, 
                role.role_name 
            FROM 
                user
            JOIN 
                role 
            ON 
                user.role_id = role.role_id
            WHERE 
                user.employee_idnumber IS NOT NULL
        `;

        db.query(query, (err, result) => {
            if (err) {
                console.error('Error fetching employees:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading employees:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





/*put: employee*/
router.put('/employee/:id', async (req, res) => {
    let user_id = req.params.id;
    console.log('User ID:', user_id);
    console.log('Request Body:', req.body);

    try {
        const {
            employee_idnumber,
            first_name,
            middle_name,
            last_name,
            suffix,
            birthdate,
            email,
            password,
            role_id,
            status,
            updatedBy
        } = req.body;

        // Validate required fields
        if (!user_id || !employee_idnumber || !first_name || !last_name || !email || !role_id || !status) {
            return res.status(400).json({ error: 'Please provide all required details.' });
        }

        // Validate employee_idnumber format
        const idFormat = /^\d{2}-\d{5}$/; // Matches "00-00000" format
        if (!idFormat.test(employee_idnumber)) {
            return res.status(400).json({ error: 'Invalid employee ID number format. It should follow "00-00000".' });
        }

        // Validate names to start with a capital letter
        const nameFormat = /^[A-Z][a-zA-Z .'-]*$/;
        if (!nameFormat.test(first_name)) {
            return res.status(400).json({
                error: 'First name must start with a capital letter and can contain only letters, spaces, dots, or dashes.'
            });
        }
        if (middle_name && !nameFormat.test(middle_name)) {
            return res.status(400).json({
                error: 'Middle name must start with a capital letter and can contain only letters, spaces, dots, or dashes.'
            });
        }
        if (!nameFormat.test(last_name)) {
            return res.status(400).json({
                error: 'Last name must start with a capital letter and can contain only letters, spaces, dots, or dashes.'
            });
        }
        if (suffix && !nameFormat.test(suffix)) {
            return res.status(400).json({
                error: 'Suffix must start with a capital letter and can contain only letters, spaces, dots, or dashes.'
            });
        }

        // Validate email format
        const emailFormat = /^[a-zA-Z0-9._%+-]+@ncf\.edu\.ph$/;
        if (!emailFormat.test(email)) {
            return res.status(400).json({ error: 'Invalid email format. Email must end with "@ncf.edu.ph".' });
        }

        // Validate password length
        if (password && password.length < 3) {
            return res.status(400).json({ error: 'Password must be at least 3 characters.' });
        }

        let hashedPassword = null;
        if (password) {
            try {
                hashedPassword = await bcrypt.hash(password, 10);
            } catch (error) {
                console.error('Error hashing password:', error);
                return res.status(500).json({ message: 'Error hashing password. Please try again.' });
            }
        }

        // Fetch the current role and status for user history
        db.query('SELECT role_id, status FROM user WHERE user_id = ?', [user_id], async (err, result) => {
            if (err) {
                console.error('Error fetching current user info:', err);
                return res.status(500).json({ message: 'Error fetching user information.' });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const currentRoleId = result[0]?.role_id;
            const currentStatus = result[0]?.status;


            // Check if any changes occurred
            const changes = {
                role_id: currentRoleId !== role_id,
                status: currentStatus !== status,
            };

            const historyValues = [
                user_id,
                currentRoleId, role_id,
                currentStatus, status,
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
                'old_role_id', 'new_role_id', 
                'old_status', 'new_status',
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
            

           
            
                   

                    // Update the user table with new values
                    const updates = [
                        'employee_idnumber = ?',
                        'first_name = ?',
                        'middle_name = ?',
                        'last_name = ?',
                        'suffix = ?',
                        'birthdate = ?',
                        'email = ?',
                        'role_id = ?',
                        'status = ?'
                    ];

                    const values = [
                        employee_idnumber,
                        first_name,
                        middle_name,
                        last_name,
                        suffix,
                        birthdate,
                        email,
                        role_id,
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
                                console.error('Error updating employee:', err);
                                return res.status(500).json({ message: 'Error updating employee information. Please try again later.' });
                            }
                            res.status(200).json(result);
                        }
                    );
                }
            );
        
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'An unexpected error occurred while updating employee information.' });
    }
});





// PUT: Batch update employees
router.put('/employees', async (req, res) => {
    const { employee_ids, updates, updatedBy } = req.body;

    console.log('Request Body:', req.body);  // Log the whole request body for debugging

    // Validate employee_ids
    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
        return res.status(400).json({ error: 'Please provide valid employee IDs' });
    }

    // Ensure at least one field is being updated
    const { role_id, status } = updates;
    if (!role_id && !status) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    // Validate individual update fields
    if (role_id && isNaN(role_id)) {
        return res.status(400).json({ error: 'Role ID must be a valid number' });
    }
    if (status && typeof status !== 'string') {
        return res.status(400).json({ error: 'Status must be a valid string' });
    }

    try {
        // Fetch current roles and statuses for the employees
        const employeesQuery = `SELECT user_id, role_id, status FROM user WHERE employee_idnumber IN (?)`;
        const [employees] = await db.promise().query(employeesQuery, [employee_ids]);

        if (employees.length === 0) {
            return res.status(404).json({ error: 'Some employees not found' });
        }

        // Prepare the history records to be inserted, including the updatedBy field
        const historyRecords = employees.map(employee => {
            return {
                user_id: employee.user_id,
                old_role_id: employee.role_id,
                new_role_id: role_id || employee.role_id,
                old_status: employee.status,
                new_status: status || employee.status,
                changed_at: new Date(),
                updated_by: updatedBy // Correctly use the updatedBy variable
            };
        });

        // Insert the history records into the user_history table
        const historyQuery = `
            INSERT INTO user_history (user_id, old_role_id, new_role_id, old_status, new_status, updated_by, changed_at)
            VALUES ?
        `;
        const historyValues = historyRecords.map(record => [
            record.user_id, 
            record.old_role_id, 
            record.new_role_id, 
            record.old_status, 
            record.new_status, 
            record.updated_by,  // Include updatedBy in the history insert
            record.changed_at
        ]);

        await db.promise().query(historyQuery, [historyValues]);

        // Generate the update query for the employee records
        const placeholders = employee_ids.map(() => '?').join(', '); // Generate placeholders for IDs
        const updateQuery = `
            UPDATE user
            SET 
                role_id = IFNULL(?, role_id), 
                status = IFNULL(?, status)
            WHERE employee_idnumber IN (${placeholders})
        `;

        // Combine updates with employee IDs for the query parameters
        const queryParams = [
            role_id || null,
            status || null,
            ...employee_ids // Spread IDs as individual values
        ];

        // Execute the update query
        const [result] = await db.promise().query(updateQuery, queryParams);
        console.log('Update result:', result);  // Log the result of the query
        console.log('Employee IDs:', employee_ids);  // Log the employee IDs

        // Return success response
        res.status(200).json({ message: 'Employees updated successfully' });
    } catch (error) {
        console.error('Error updating employees:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





/*delete: employee*/
router.delete('/employee/:id', (req, res) => {
    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM user WHERE user_id = ?', [user_id], (err, result, fields) => {
            if (err) {
                console.error('Error deleting employee:', err);
                return res.status(500).json({ message: 'Internal Server Error', details: err });
            } else {
                res.status(200).json({ message: 'Employee deleted successfully' });
            }
        });
    } catch (error) {
        console.error('Error loading employee:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error });
    }
});





// DELETE: Batch delete employees
router.delete('/employees', async (req, res) => {
    const { employee_ids } = req.body;

    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
        return res.status(400).json({ error: 'Please provide valid employee IDs' });
    }

    try {
        const deleteQuery = `DELETE FROM user WHERE employee_idnumber IN (?)`;
        await db.promise().query(deleteQuery, [employee_ids]);

        res.status(200).json({ message: 'Employees deleted successfully' });
    } catch (error) {
        console.error('Error deleting employees:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






module.exports = router;
