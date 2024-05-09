const express = require('express');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router();
const mysql = require('mysql2'); /*use mysql2 package*/


const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'NORMSLOCAL'
});

router.post('/student-login', async (req, res) => {
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
        console.log('User data:', user);

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If passwords do not match, return 401 Unauthorized
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Parse birthdate string into day, month, and year
        const birthdate = user.birthdate ? new Date(user.birthdate) : null;
      

        // Generate JWT token with user's student_idnumber
        const token = jwt.sign({ userId: user.student_idnumber, student_idnumber: user.student_idnumber }, secretKey, { expiresIn: '1h' });

        // Return the token, day, month, and year in the response
        res.status(200).json({ token, birthdate });
    } catch (error) {
        // Handle any errors that occur during login process
        console.error('Error logging in student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* post: register students*/
router.post('/register-student', async (req, res) => {
    try {
        const { student_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, password,year_level,profile_photo_filename, role_id, department_id,program_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertStudentQuery = 'INSERT INTO user (student_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, password,year_level,profile_photo_filename, role_id, department_id,program_id) VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?)';
        await db.promise().execute(insertStudentQuery, [student_idnumber, first_name,middle_name,last_name,suffix,  birthdate,email, hashedPassword,year_level,profile_photo_filename, role_id, department_id,program_id]);

        res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
        console.error('Error registering employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/students', (req, res) => {
    try {
        db.query(`SELECT student_idnumber, first_name, middle_name, last_name, suffix, DATE_FORMAT(birthdate, '%m/%d/%Y') AS birthdate, email, profile_photo_filename, role_id, department_id, program_id, year_level, status FROM user WHERE student_idnumber IS NOT NULL`, (err, result) => {
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


/*get: 1 role*/
router.get('/students/:id',  (req, res) => {

    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('SELECT *  FROM user WHERE user_id = ?', user_id, (err, result) => {
            if (err) {
                console.error('Error fetching role:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/students/:student_idnumber', async (req, res) => {
    const studentId = req.params.student_idnumber;

    try {
        // Execute SQL query to fetch student data by ID
        const [rows] = await pool.query('SELECT * FROM user WHERE student_idnumber = ?', [studentId]);
        const student = rows[0]; // Assuming student_idnumber is unique

        res.json(student);
    } catch (error) {
        console.error('Error fetching student data:', error);
        res.status(500).json({ error: 'An error occurred while fetching student data' });
    }
});


module.exports = router;
