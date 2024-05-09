const express = require('express');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router();

/* post: student login */
router.post('/student-loginss', async (req, res) => {
    try {
        // Extract student_idnumber and password from request body
        const { student_idnumber, password } = req.body;

        // Query to retrieve user data based on student_idnumber
        const getUserQuery = 'SELECT * FROM user WHERE student_idnumber = ?';
        // Execute the query and retrieve the result
        const [rows] = await db.promise().execute(getUserQuery, [student_idnumber]);

        // If no user is found with the given student_idnumber, return 401 Unauthorized
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid student number' });
        }

        // Retrieve the user data from the first row of the result
        const user = rows[0];
        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If passwords do not match, return 401 Unauthorized
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT token with user's student_idnumber
        const token = jwt.sign({ userId: user.student_idnumber, student_idnumber: user.student_idnumber }, secretKey, { expiresIn: '1h' });

        // Return the token in the response
        res.status(200).json({ token });
    } catch (error) {
        // Handle any errors that occur during login process
        console.error('Error logging in student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* post: register students*/
router.post('/register-students', async (req, res) => {
    try {
        const { student_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, password,year_level,profile_photo_filename, role_id, department_id,program_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertStudentQuery = 'INSERT INTO user (student_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, password,year_level,profile_photo_filename, role_id, department_id,program_id) VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?)';
        await db.promise().execute(insertStudentQuery, [student_idnumber, first_name,middle_name,last_name, birthdate,suffix, email, hashedPassword,year_level,profile_photo_filename, role_id, department_id,program_id]);

        res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
        console.error('Error registering employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/users', (req, res) => {
    try {
        db.query(`SELECT * FROM user`, (err, result) => {
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


module.exports = router;
